'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, Wrench, TrendingUp, Clock, CheckCircle } from 'lucide-react'

interface PaymentTypeToggleProps {
  onTypeChange?: (type: 'rent' | 'repairs') => void
  className?: string
}

export default function PaymentTypeToggle({ onTypeChange, className = '' }: PaymentTypeToggleProps) {
  const [activeType, setActiveType] = useState<'rent' | 'repairs'>('rent')

  const handleTypeChange = (type: 'rent' | 'repairs') => {
    setActiveType(type)
    onTypeChange?.(type)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toggle Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={activeType === 'rent' ? 'default' : 'outline'}
          onClick={() => handleTypeChange('rent')}
          className={`h-12 gap-2 rounded-xl transition-all ${
            activeType === 'rent' 
              ? 'bg-accent text-accent-foreground shadow-sm shadow-accent/20' 
              : 'border-border hover:bg-secondary'
          }`}
        >
          <Home className="w-4 h-4" />
          Rent & Fees
        </Button>
        <Button
          variant={activeType === 'repairs' ? 'default' : 'outline'}
          onClick={() => handleTypeChange('repairs')}
          className={`h-12 gap-2 rounded-xl transition-all ${
            activeType === 'repairs' 
              ? 'bg-accent text-accent-foreground shadow-sm shadow-accent/20' 
              : 'border-border hover:bg-secondary'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Repairs & Services
        </Button>
      </div>

      {/* Info Cards */}
      {activeType === 'rent' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Monthly Rent
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                Regular monthly payments
              </p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Water Bill
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                Utility charges
              </p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Due Monthly
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                Automatic reminders
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: <Wrench className="w-5 h-5" />, name: 'Repairs', desc: 'Fixtures & fittings' },
            { icon: <TrendingUp className="w-5 h-5" />, name: 'Services', desc: 'Professional work' },
            { icon: <Clock className="w-5 h-5" />, name: 'One-time', desc: 'Single payments' },
            { icon: <CheckCircle className="w-5 h-5" />, name: 'Custom', desc: 'Flexible pricing' }
          ].map((item, index) => (
            <Card key={index} className="bg-muted/30 border-border hover:bg-muted/50 transition-colors">
              <CardContent className="p-3 text-center">
                <div className="text-accent mb-2 flex justify-center">{item.icon}</div>
                <p className="text-xs font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
