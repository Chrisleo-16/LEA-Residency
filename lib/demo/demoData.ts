// lib/demo/demoData.ts

const TENANT_NAMES = ['Sarah Mwangi', 'James Otieno', 'Grace Achieng', 'Brian Kiprotich', 'Faith Njeri']
const LANDLORD_NAME = 'David Kamau'

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo))
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60))
  return d.toISOString()
}

export interface DemoMessage {
  id: string
  content: string
  sender_id: string
  sender_name: string
  created_at: string
  is_me: boolean
}

export function generateDemoChatMessages(demoRole: 'tenant' | 'landlord', demoName: string): DemoMessage[] {
  const otherName = demoRole === 'tenant' ? LANDLORD_NAME : randomFrom(TENANT_NAMES)

  const scripts = [
    { from: 'other', text: 'Hi! Just confirming you received this month\'s rent reminder?' },
    { from: 'me', text: 'Yes, I saw it. Will pay by Friday.' },
    { from: 'other', text: 'Perfect, thank you! Also wanted to ask about the water heater repair.' },
    { from: 'me', text: 'It\'s scheduled for tomorrow morning around 9am.' },
    { from: 'other', text: 'Great, I\'ll be available then. Thanks for the quick response! 👍' },
  ]

  return scripts.map((s, i) => ({
    id: `demo-msg-${i}`,
    content: s.text,
    sender_id: s.from === 'me' ? 'demo-self' : 'demo-other',
    sender_name: s.from === 'me' ? demoName : otherName,
    created_at: randomDate(3 - i * 0.3),
    is_me: s.from === 'me',
  }))
}

export function generateDemoCommunityMessages(): DemoMessage[] {
  const posts = [
    { name: 'Grace Achieng', text: 'Does anyone know if the gym is open this weekend?' },
    { name: 'James Otieno', text: 'Yes! Open 6am-9pm on Saturday and Sunday 🏋️' },
    { name: 'Brian Kiprotich', text: 'Thanks for the parking notice, very helpful.' },
    { name: 'Sarah Mwangi', text: 'Welcome to all the new residents who joined this month! 🎉' },
  ]
  return posts.map((p, i) => ({
    id: `demo-community-${i}`,
    content: p.text,
    sender_id: `demo-resident-${i}`,
    sender_name: p.name,
    created_at: randomDate(7 - i),
    is_me: false,
  }))
}

export interface DemoAnnouncement {
  id: string
  title: string
  content: string
  created_at: string
}

export function generateDemoAnnouncements(): DemoAnnouncement[] {
  return [
    {
      id: 'demo-ann-1',
      title: 'Water Supply Maintenance — This Saturday',
      content: 'There will be a scheduled water supply interruption this Saturday from 9am to 2pm for tank cleaning and maintenance. Please store enough water in advance. We apologize for any inconvenience.',
      created_at: randomDate(2),
    },
    {
      id: 'demo-ann-2',
      title: 'New Visitor Parking Policy',
      content: 'Starting next month, all visitors must register at the gate and display a visitor pass on their dashboard. This helps us maintain better security for all residents.',
      created_at: randomDate(10),
    },
    {
      id: 'demo-ann-3',
      title: 'Community Clean-Up Day',
      content: 'Join us this Sunday for our quarterly community clean-up day! Refreshments will be provided. Let\'s keep LEA Executive looking great together.',
      created_at: randomDate(20),
    },
  ]
}

export interface DemoComplaint {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'resolved'
  created_at: string
  tenant_name: string
}

export function generateDemoComplaints(demoRole: 'tenant' | 'landlord', demoName: string): DemoComplaint[] {
  const items = [
    { title: 'Leaking kitchen tap', description: 'The kitchen tap has been leaking for two days, getting worse. Needs a plumber.', status: 'in_progress' as const },
    { title: 'Noisy neighbors at night', description: 'Loud music from the unit above most nights past 11pm.', status: 'pending' as const },
    { title: 'Broken hallway light', description: 'The light outside my door has been out for a week.', status: 'resolved' as const },
  ]
  return items.map((item, i) => ({
    id: `demo-complaint-${i}`,
    ...item,
    created_at: randomDate(15 - i * 4),
    tenant_name: demoRole === 'tenant' ? demoName : randomFrom(TENANT_NAMES),
  }))
}

export interface DemoRequest {
  id: string
  title: string
  description: string
  category: string
  status: 'pending' | 'in_progress' | 'resolved'
  created_at: string
  tenant_name: string
}

export function generateDemoRequests(demoRole: 'tenant' | 'landlord', demoName: string): DemoRequest[] {
  const items = [
    { title: 'AC servicing needed', description: 'Annual servicing for the unit\'s AC, hasn\'t been done this year.', category: 'maintenance', status: 'pending' as const },
    { title: 'Request for move-out inspection', description: 'Planning to move out end of next month, requesting inspection date.', category: 'moveout', status: 'pending' as const },
    { title: 'Power socket not working', description: 'The socket near the TV stopped working yesterday.', category: 'utility', status: 'resolved' as const },
  ]
  return items.map((item, i) => ({
    id: `demo-request-${i}`,
    ...item,
    created_at: randomDate(12 - i * 3),
    tenant_name: demoRole === 'tenant' ? demoName : randomFrom(TENANT_NAMES),
  }))
}

export interface DemoPayment {
  id: string
  amount: number
  mpesa_code: string
  payment_month: string
  payment_date: string
  status: string
  payment_method: string
  tenant_name: string
}

export function generateDemoPayments(demoRole: 'tenant' | 'landlord', demoName: string): DemoPayment[] {
  const tenantPool = demoRole === 'tenant' ? [demoName] : TENANT_NAMES
  const months = ['2026-06', '2026-05', '2026-04']
  const payments: DemoPayment[] = []

  tenantPool.forEach((name, ti) => {
    months.forEach((month, mi) => {
      if (Math.random() > 0.15) {
        payments.push({
          id: `demo-payment-${ti}-${mi}`,
          amount: randomFrom([12000, 15000, 18000, 22000]),
          mpesa_code: `R${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          payment_month: month,
          payment_date: randomDate(30 * (mi + 1)),
          status: 'confirmed',
          payment_method: 'mpesa',
          tenant_name: name,
        })
      }
    })
  })

  return payments
}

export interface DemoPolicy {
  id: string
  title: string
  content: string
  category: string
  created_at: string
}

export function generateDemoPolicies(): DemoPolicy[] {
  return [
    {
      id: 'demo-policy-1',
      title: 'House Rules & Quiet Hours',
      content: 'Quiet hours are from 10pm to 6am daily. All residents are expected to be respectful of neighbors. Pets must be registered with management. No smoking in common areas.',
      category: 'house_rules',
      created_at: randomDate(60),
    },
    {
      id: 'demo-policy-2',
      title: 'Rent Payment Guidelines',
      content: 'Rent is due by the 5th of every month via M-Pesa. Late payments after the 5th attract a 10% penalty. Please always keep your M-Pesa confirmation message.',
      category: 'rent_payment',
      created_at: randomDate(90),
    },
    {
      id: 'demo-policy-3',
      title: 'Maintenance Request Process',
      content: 'Submit all maintenance requests through the Requests tab. Urgent issues (water leaks, electrical faults) are addressed within 24 hours. Non-urgent requests within 3-5 business days.',
      category: 'maintenance',
      created_at: randomDate(45),
    },
  ]
}