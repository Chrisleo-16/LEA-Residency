/**
 * Landlord Financial Dashboard API
 * Returns collection rate, net yield, cash flow, and other metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/database/client';
import FinancialEngine from '@/lib/engines/financial_engine';

/**
 * GET /api/landlord/financial
 * Get portfolio financial summary
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');
    const propertyId = searchParams.get('propertyId');
    const metric = searchParams.get('metric'); // 'portfolio', 'property', 'projection', 'yield'

    if (!landlordId) {
      return NextResponse.json(
        { error: 'landlordId required' },
        { status: 400 }
      );
    }

    const db = initializeDatabase({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      maxRetries: 3,
      retryDelay: 1000
    });

    const financialEngine = new FinancialEngine();

    // Portfolio metrics
    if (!metric || metric === 'portfolio') {
      const portfolioMetrics = await financialEngine.getPortfolioMetrics(landlordId);

      return NextResponse.json({
        type: 'portfolio',
        data: {
          totalProperties: portfolioMetrics.totalProperties,
          totalUnits: portfolioMetrics.totalUnits,
          totalMonthlyExpectedRent: portfolioMetrics.totalMonthlyExpectedRent,
          totalMonthlyActualCollected: portfolioMetrics.totalMonthlyActualCollected,
          collectionRate: {
            percentage: portfolioMetrics.portfolioCollectionRate,
            status: portfolioMetrics.portfolioCollectionRate >= 85 ? 'healthy' : 'warning'
          },
          occupancyRate: {
            percentage: portfolioMetrics.portfolioOccupancyRate,
            occupiedUnits: portfolioMetrics.totalUnits -
              Math.round((100 - portfolioMetrics.portfolioOccupancyRate) / 100 * portfolioMetrics.totalUnits)
          },
          netProfit: {
            monthly: portfolioMetrics.monthlyNetProfit,
            average: portfolioMetrics.monthlyNetProfit
          },
          averageExpenses: portfolioMetrics.averageMonthlyExpenses,
          overduePayments: {
            amount: portfolioMetrics.overduePayments,
            count: portfolioMetrics.overdueCount,
            status: portfolioMetrics.overdueCount > 0 ? 'critical' : 'clear'
          },
          topProperty: portfolioMetrics.topPerformingProperty
            ? {
                id: portfolioMetrics.topPerformingProperty.id,
                name: portfolioMetrics.topPerformingProperty.name,
                collectionRate: portfolioMetrics.topPerformingProperty.collectionRate
              }
            : null,
          lowestProperty: portfolioMetrics.lowestPerformingProperty
            ? {
                id: portfolioMetrics.lowestPerformingProperty.id,
                name: portfolioMetrics.lowestPerformingProperty.name,
                collectionRate: portfolioMetrics.lowestPerformingProperty.collectionRate
              }
            : null
        }
      });
    }

    // Property-specific metrics
    if (metric === 'property' && propertyId) {
      const currentMonth = new Date();
      const metrics = await financialEngine.getMonthlyMetrics(propertyId, currentMonth);

      return NextResponse.json({
        type: 'property',
        property: propertyId,
        data: {
          month: metrics.month.toISOString().split('T')[0],
          expectedRent: metrics.expectedRent,
          actualCollected: metrics.actualCollected,
          collectionRate: metrics.collectionRate,
          netProfit: metrics.netProfit,
          expenses: metrics.expenses,
          occupancy: {
            occupied: metrics.occupiedUnits,
            vacant: metrics.vacantUnits,
            rate: metrics.occupancyRate
          },
          overdue: {
            amount: metrics.overdueAmount,
            count: metrics.overdueCount
          }
        }
      });
    }

    // Cash flow projection
    if (metric === 'projection') {
      const projection = await financialEngine.getCashFlowProjection(landlordId, 6);

      return NextResponse.json({
        type: 'cashflow_projection',
        months: 6,
        data: projection
      });
    }

    // Net yield calculation
    if (metric === 'yield') {
      const yield_ = await financialEngine.calculateNetYield(landlordId);

      return NextResponse.json({
        type: 'net_yield',
        data: {
          percentageYield: yield_,
          status: yield_ >= 8 ? 'exceptional' : yield_ >= 6 ? 'good' : 'below_target'
        }
      });
    }

    return NextResponse.json(
      { error: 'Unknown metric type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Financial dashboard error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/landlord/financial/save-summary
 * Save monthly summary (called by background job)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { landlordId, propertyId, month } = body;

    if (!landlordId || !month) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = initializeDatabase({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      maxRetries: 3,
      retryDelay: 1000
    });

    const financialEngine = new FinancialEngine();
    const targetMonth = new Date(month);

    if (propertyId) {
      // Save property-specific summary
      const metrics = await financialEngine.getMonthlyMetrics(propertyId, targetMonth);
      await financialEngine.saveFinancialSummary(landlordId, propertyId, targetMonth, metrics);
    } else {
      // Save portfolio summary
      const metrics = await financialEngine.getPortfolioMetrics(landlordId);
      await financialEngine.saveFinancialSummary(landlordId, null, targetMonth, metrics);
    }

    return NextResponse.json({
      success: true,
      message: 'Financial summary saved'
    });
  } catch (error) {
    console.error('Save financial summary error:', error);
    return NextResponse.json(
      { error: 'Failed to save summary' },
      { status: 500 }
    );
  }
}

export default { GET, POST };
