'use client'

import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import './tour.css'

const landlordSteps: DriveStep[] = [
  {
    element: '[data-tour="nav-leads"]',
    popover: {
      title: 'Tenant Leads',
      description: 'Prospective tenants interested in your property show up here — review and respond to them.',
    },
  },
  {
    element: '[data-tour="nav-payments"]',
    popover: {
      title: 'Rent Ledger',
      description: "See who's paid, who hasn't, and log payments manually if needed.",
    },
  },
  {
    element: '[data-tour="nav-complaints"]',
    popover: {
      title: 'Complaints',
      description: 'Issues your tenants raise land here so you can resolve them.',
    },
  },
  {
    element: '[data-tour="nav-requests"]',
    popover: {
      title: 'Requests',
      description: 'Maintenance and other requests submitted by your tenants.',
    },
  },
  {
    element: '[data-tour="nav-billing"]',
    popover: {
      title: 'Subscription Billing',
      description: 'Manage your own subscription and billing details here.',
    },
  },
  {
    element: '[data-tour="nav-settings"]',
    popover: {
      title: 'Settings',
      description: 'Update your profile, property, and account preferences.',
    },
  },
]

const tenantSteps: DriveStep[] = [
  {
    element: '[data-tour="nav-chat"]',
    popover: {
      title: 'Chat with Landlord',
      description: 'Message your landlord directly from here.',
    },
  },
  {
    element: '[data-tour="nav-community"]',
    popover: {
      title: 'Community',
      description: 'Connect with other tenants in your building.',
    },
  },
  {
    element: '[data-tour="nav-complaints"]',
    popover: {
      title: 'My Complaints',
      description: 'Raise and track issues with your landlord.',
    },
  },
  {
    element: '[data-tour="nav-requests"]',
    popover: {
      title: 'My Requests',
      description: 'Submit and follow up on maintenance requests.',
    },
  },
  {
    element: '[data-tour="nav-payments"]',
    popover: {
      title: 'Payments',
      description: 'View your rent payment history.',
    },
  },
  {
    element: '[data-tour="nav-settings"]',
    popover: {
      title: 'Settings',
      description: 'Update your profile and account preferences.',
    },
  },
]

interface StartTourOptions {
  onComplete?: () => void
  delayMs?: number
}

/**
 * delayMs lets the caller open a mobile off-canvas sidebar and wait for its
 * slide-in transition before driver.js measures element positions.
 */
export function startTour(role: string | null, options: StartTourOptions = {}) {
  const { onComplete, delayMs = 0 } = options
  const steps = role === 'landlord' ? landlordSteps : tenantSteps

  const run = () => {
    const availableSteps = steps.filter((step) =>
      typeof step.element === 'string' ? !!document.querySelector(step.element) : true
    )

    if (availableSteps.length === 0) {
      onComplete?.()
      return
    }

    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      popoverClass: 'lea-tour-popover',
      steps: availableSteps,
      onDestroyed: () => onComplete?.(),
    })

    driverObj.drive()
  }

  if (delayMs > 0) {
    setTimeout(run, delayMs)
  } else {
    run()
  }
}
