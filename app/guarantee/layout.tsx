import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LEA Rent Guarantee',
  description: 'Underwriting and rent coverage — separate from LEA Property Management.',
}

export default function GuaranteeLayout({ children }: { children: React.ReactNode }) {
  return children
}
