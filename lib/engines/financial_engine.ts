/**
 * Financial Engine - Core Analytics & Metrics Calculation
 * Production-ready financial calculations for landlord dashboard
 */

import { getDatabase } from '@/lib/database/client';
import { FinancialSummary, Lease, Unit, Property } from '@/lib/types';

interface MonthlyMetrics {
  month: Date;
  expectedRent: number;
  actualCollected: number;
  collectionRate: number;
  overdueAmount: number;
  overdueCount: number;
  expenses: {
    maintenance: number;
    utilities: number;
    management: number;
    other: number;
    total: number;
  };
  netProfit: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
}

interface PortfolioMetrics {
  totalProperties: number;
  totalUnits: number;
  totalMonthlyExpectedRent: number;
  totalMonthlyActualCollected: number;
  portfolioCollectionRate: number;
  portfolioOccupancyRate: number;
  monthlyNetProfit: number;
  averageMonthlyExpenses: number;
  topPerformingProperty: {
    id: string;
    name: string;
    collectionRate: number;
  } | null;
  lowestPerformingProperty: {
    id: string;
    name: string;
    collectionRate: number;
  } | null;
  overduePayments: number;
  overdueCount: number;
}

interface CashFlowProjection {
  month: string;
  projectedIncome: number;
  projectedExpenses: number;
  projectedCashFlow: number;
  confidence: 'high' | 'medium' | 'low';
}

class FinancialEngine {
  private db = getDatabase();

  /**
   * Calculate monthly metrics for a property
   */
  async getMonthlyMetrics(
    propertyId: string,
    month: Date
  ): Promise<MonthlyMetrics> {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Get all leases active during this month
    const { data: leases, error: leaseError } = await this.db.getClient()
      .from('leases')
      .select('*, units(*)')
      .eq('ul(property_id', propertyId)
      .or(`lease_end_date.gte.${formatDate(startDate)},lease_start_date.lte.${formatDate(endDate)}`);

    if (leaseError || !leases) {
      throw new Error('Failed to fetch leases');
    }

    // Get payments for this period
    const { data: payments, error: paymentError } = await this.db.getClient()
      .from('payments')
      .select('*')
      .in('lease_id', leases.map(l => l.id))
      .gte('due_date', formatDate(startDate))
      .lte('due_date', formatDate(endDate));

    if (paymentError) {
      throw new Error('Failed to fetch payments');
    }

    // Get maintenance costs
    const { data: maintenance, error: maintenanceError } = await this.db.getClient()
      .from('maintenance_requests')
      .select('actual_cost')
      .eq('unit_id', propertyId) // This needs adjustment - should be unit-based
      .eq('status', 'completed')
      .gte('actual_completion_date', formatDate(startDate))
      .lte('actual_completion_date', formatDate(endDate));

    if (maintenanceError) {
      throw new Error('Failed to fetch maintenance costs');
    }

    // Calculate metrics
    let expectedRent = 0;
    let occupiedCount = 0;
    let totalUnits = 0;

    for (const lease of leases) {
      totalUnits++;
      if (new Date(lease.lease_start_date) <= endDate && new Date(lease.lease_end_date) >= startDate) {
        // Lease was active during this month
        occupiedCount++;
        expectedRent += lease.monthly_rent;
      }
    }

    const completedPayments = (payments || []).filter(p => p.status === 'completed');
    const actualCollected = completedPayments.reduce((sum, p) => sum + p.amount, 0);

    const overduePayments = (payments || []).filter(
      p => p.status === 'pending' && new Date(p.due_date) < new Date()
    );
    const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0);

    const maintenanceCosts = (maintenance || []).reduce((sum, m) => sum + (m.actual_cost || 0), 0);

    const expenses = {
      maintenance: maintenanceCosts,
      utilities: 0, // Would need to aggregate from units
      management: 0, // Could be percentage-based
      other: 0,
      total: maintenanceCosts
    };

    const collectionRate = expectedRent > 0 ? (actualCollected / expectedRent) * 100 : 0;
    const occupancyRate = totalUnits > 0 ? (occupiedCount / totalUnits) * 100 : 0;

    return {
      month: startDate,
      expectedRent,
      actualCollected,
      collectionRate: Math.round(collectionRate * 100) / 100,
      overdueAmount,
      overdueCount: overduePayments.length,
      expenses,
      netProfit: actualCollected - expenses.total,
      occupiedUnits: occupiedCount,
      vacantUnits: totalUnits - occupiedCount,
      occupancyRate: Math.round(occupancyRate * 100) / 100
    };
  }

  /**
   * Calculate portfolio-wide metrics
   */
  async getPortfolioMetrics(landlordId: string): Promise<PortfolioMetrics> {
    try {
      // Get all properties
      const { data: properties, error: propertiesError } = await this.db.getClient()
        .from('properties')
        .select('*, units(*)')
        .eq('landlord_id', landlordId)
        .is('deleted_at', null);

      if (propertiesError || !properties) {
        throw new Error('Failed to fetch properties');
      }

      // Get active leases
      const { data: leases, error: leaseError } = await this.db.getClient()
        .from('leases')
        .select('monthly_rent')
        .eq('landlord_id', landlordId)
        .eq('status', 'active')
        .is('deleted_at', null);

      if (leaseError) {
        throw new Error('Failed to fetch leases');
      }

      // Get current month payments
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data: monthlyPayments, error: paymentsError } = await this.db.getClient()
        .from('payments')
        .select('*')
        .eq('landlord_id', landlordId)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd);

      if (paymentsError) {
        throw new Error('Failed to fetch payments');
      }

      // Get overdue payments
      const { data: overduePayments, error: overdueError } = await this.db.getClient()
        .from('payments')
        .select('*')
        .eq('landlord_id', landlordId)
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString().split('T')[0]);

      if (overdueError) {
        throw new Error('Failed to fetch overdue payments');
      }

      // Calculate totals
      const totalUnits = properties.reduce((sum, p: any) => sum + (p.units?.length || 0), 0);
      const totalMonthlyExpectedRent = (leases || []).reduce((sum, l: any) => sum + l.monthly_rent, 0);
      const totalActualCollected = (monthlyPayments || [])
        .filter((p: any) => p.status === 'completed')
        .reduce((sum, p: any) => sum + p.amount, 0);

      const portfolioCollectionRate =
        totalMonthlyExpectedRent > 0
          ? Math.round((totalActualCollected / totalMonthlyExpectedRent) * 10000) / 100
          : 0;

      // Get individual property metrics for comparison
      const propertyMetrics = await Promise.all(
        properties.map(async (prop: any) => ({
          id: prop.id,
          name: prop.property_name,
          metrics: await this.getMonthlyMetrics(prop.id, now)
        }))
      );

      const validMetrics = propertyMetrics
        .filter((p: any) => p.metrics.expectedRent > 0)
        .sort((a: any, b: any) => b.metrics.collectionRate - a.metrics.collectionRate);

      return {
        totalProperties: properties.length,
        totalUnits,
        totalMonthlyExpectedRent,
        totalMonthlyActualCollected: totalActualCollected,
        portfolioCollectionRate,
        portfolioOccupancyRate: propertyMetrics.length > 0
          ? propertyMetrics.reduce((sum: number, p: any) => sum + p.metrics.occupancyRate, 0) /
            propertyMetrics.length
          : 0,
        monthlyNetProfit: totalActualCollected - propertyMetrics.reduce(
          (sum: number, p: any) => sum + p.metrics.expenses.total,
          0
        ),
        averageMonthlyExpenses: propertyMetrics.reduce(
          (sum: number, p: any) => sum + p.metrics.expenses.total,
          0
        ) / Math.max(propertyMetrics.length, 1),
        topPerformingProperty: validMetrics.length > 0
          ? {
              id: validMetrics[0].id,
              name: validMetrics[0].name,
              collectionRate: validMetrics[0].metrics.collectionRate
            }
          : null,
        lowestPerformingProperty: validMetrics.length > 0
          ? {
              id: validMetrics[validMetrics.length - 1].id,
              name: validMetrics[validMetrics.length - 1].name,
              collectionRate: validMetrics[validMetrics.length - 1].metrics.collectionRate
            }
          : null,
        overduePayments: (overduePayments || []).reduce((sum, p: any) => sum + p.amount, 0),
        overdueCount: overduePayments?.length || 0
      };
    } catch (error) {
      console.error('Error calculating portfolio metrics:', error);
      throw error;
    }
  }

  /**
   * Save monthly summary (denormalization for performance)
   */
  async saveFinancialSummary(
    landlordId: string,
    propertyId: string | null,
    month: Date,
    metrics: any
  ): Promise<void> {
    try {
      const summaryMonth = new Date(month.getFullYear(), month.getMonth(), 1);

      const { error } = await this.db.getClient()
        .from('financial_summaries')
        .upsert([
          {
            landlord_id: landlordId,
            property_id: propertyId,
            summary_month: summaryMonth.toISOString().split('T')[0],
            expected_rent: metrics.expectedRent || 0,
            actual_rent_collected: metrics.actualCollected || 0,
            collection_rate: metrics.collectionRate || 0,
            expenses: metrics.expenses?.total || 0,
            expenses_breakdown: metrics.expenses || {},
            net_profit: metrics.netProfit || 0,
            overdue_payments: metrics.overdueAmount || 0,
            overdue_count: metrics.overdueCount || 0,
            vacancy_count: metrics.vacantUnits || 0,
            occupancy_rate: metrics.occupancyRate || 0
          }
        ]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving financial summary:', error);
      // Don't throw - denormalization failure shouldn't block main flow
    }
  }

  /**
   * Generate cash flow projection
   */
  async getCashFlowProjection(
    landlordId: string,
    months: number = 6
  ): Promise<CashFlowProjection[]> {
    const projections: CashFlowProjection[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const projectedMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthStr = projectedMonth.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      try {
        const metrics = await this.getMonthlyMetrics(landlordId, projectedMonth);
        const projectedIncome = metrics.expectedRent * (metrics.collectionRate / 100);
        const projectedExpenses = metrics.expenses.total;
        const projectedCashFlow = projectedIncome - projectedExpenses;

        projections.push({
          month: monthStr,
          projectedIncome: Math.round(projectedIncome),
          projectedExpenses: Math.round(projectedExpenses),
          projectedCashFlow: Math.round(projectedCashFlow),
          confidence: i === 0 ? 'high' : i < 3 ? 'medium' : 'low'
        });
      } catch (error) {
        console.error(`Error projecting month ${i}:`, error);
      }
    }

    return projections;
  }

  /**
   * Calculate net yield for portfolio
   */
  async calculateNetYield(landlordId: string): Promise<number> {
    try {
      const metrics = await this.getPortfolioMetrics(landlordId);

      if (metrics.totalMonthlyExpectedRent === 0) {
        return 0;
      }

      const annualIncome = metrics.totalMonthlyActualCollected * 12;
      const annualExpenses = metrics.averageMonthlyExpenses * 12;

      return Math.round(
        ((annualIncome - annualExpenses) / (metrics.totalMonthlyExpectedRent * 12)) * 100 * 100
      ) / 100;
    } catch (error) {
      console.error('Error calculating net yield:', error);
      return 0;
    }
  }
}

export default FinancialEngine;
