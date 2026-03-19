import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function POST(req: NextRequest) {
  const { tenantName, tenantId, tenantEmail } = await req.json()

  if (!tenantName || !tenantEmail) {
    return NextResponse.json({ error: 'Missing tenant details' }, { status: 400 })
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Africa/Nairobi',
  })

  const script = `
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from io import BytesIO
import base64

def generate(tenant_name, tenant_id, tenant_email, date_str):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('T', parent=styles['Title'], fontSize=20, textColor=colors.HexColor('#0d9488'), spaceAfter=6, alignment=1, fontName='Helvetica-Bold')
    subtitle_style = ParagraphStyle('S', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#6b7280'), alignment=1, spaceAfter=20)
    section_style = ParagraphStyle('SH', parent=styles['Normal'], fontSize=12, fontName='Helvetica-Bold', textColor=colors.HexColor('#0d9488'), spaceBefore=16, spaceAfter=6)
    body_style = ParagraphStyle('B', parent=styles['Normal'], fontSize=9.5, textColor=colors.HexColor('#374151'), spaceAfter=5, leading=14, alignment=4)
    clause_style = ParagraphStyle('C', parent=styles['Normal'], fontSize=9.5, textColor=colors.HexColor('#374151'), spaceAfter=5, leading=14, leftIndent=16, alignment=4)
    highlight_style = ParagraphStyle('H', parent=styles['Normal'], fontSize=9.5, textColor=colors.HexColor('#1e40af'), fontName='Helvetica-Bold', spaceAfter=3, leading=14)
    label_style = ParagraphStyle('L', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#6b7280'))
    value_style = ParagraphStyle('V', parent=styles['Normal'], fontSize=9.5, textColor=colors.HexColor('#111827'), fontName='Helvetica-Bold')
    footer_style = ParagraphStyle('F', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#9ca3af'), alignment=1)

    story = []
    story.append(Paragraph("LEA Executive Residency", title_style))
    story.append(Paragraph("Tenancy Agreement - Official Document", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0d9488'), spaceAfter=16))

    intro_data = [[Paragraph("This agreement is electronically generated and pre-filled with your details upon your digital acceptance of LEA Executive Residency policies. Please review all terms carefully, print this document, and sign physically where indicated.", body_style)]]
    intro_table = Table(intro_data, colWidths=[16.5*cm])
    intro_table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#f0fdf4')),('BOX',(0,0),(-1,-1),1,colors.HexColor('#86efac')),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12)]))
    story.append(intro_table)
    story.append(Spacer(1,16))

    story.append(Paragraph("PARTIES TO THIS AGREEMENT", section_style))
    details = [
        [Paragraph("TENANT NAME",label_style), Paragraph(tenant_name.upper(),value_style)],
        [Paragraph("NATIONAL ID",label_style), Paragraph(tenant_id or "To be provided upon signing",value_style)],
        [Paragraph("EMAIL ADDRESS",label_style), Paragraph(tenant_email,value_style)],
        [Paragraph("LANDLORD / AGENT",label_style), Paragraph("LEA Executive Residency Management",value_style)],
        [Paragraph("AGREEMENT DATE",label_style), Paragraph(date_str,value_style)],
        [Paragraph("PROPERTY",label_style), Paragraph("LEA Executive Residency and Apartments",value_style)],
        [Paragraph("LEASE TERM",label_style), Paragraph("12 Months (Renewable)",value_style)],
    ]
    dt = Table(details, colWidths=[4.5*cm,12*cm])
    dt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#f9fafb')),('BACKGROUND',(0,0),(0,-1),colors.HexColor('#f3f4f6')),('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#e5e7eb')),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(dt)
    story.append(Spacer(1,16))

    story.append(Paragraph("AGREEMENT TERMS", section_style))
    story.append(Paragraph(f"This agreement is made between <b>{tenant_name}</b> (the Tenant) and <b>LEA Executive Residency Management</b> (the Landlord) on {date_str}.", body_style))
    story.append(Spacer(1,8))

    clauses = [
        ("1. LEASE PERIOD AND RENT", "The lease period shall be for <b>12 Months</b>, renewable. Monthly rent is payable by the <b>5th day of each month</b>. Late payment attracts a penalty of <b>10% of monthly rent</b>. Bounced cheques attract re-collection fees of <b>KShs. 3,500/=</b>."),
        ("2. UTILITY BILLS", "Rent is <b>exclusive of utility bills</b> (electricity and water), payable by the Tenant. Refundable deposits for electricity and water are payable upon signing."),
        ("3. SECURITY DEPOSIT", "A <b>refundable deposit equivalent to two (2) months rent</b> is payable upon signing. The deposit must not be used as rent under any circumstances."),
        ("4. NOTICE TO TERMINATE", "Either party may terminate by giving <b>30 days written notice</b> or payment of one month rent in lieu of notice."),
        ("5. CONSIDERATION", "The Tenant agrees to pay all consideration fees including stamp duty and charges for preparation of this Agreement."),
    ]
    for h, t in clauses:
        story.append(Paragraph(f"<b>{h}</b>", highlight_style))
        story.append(Paragraph(t, clause_style))
        story.append(Spacer(1,4))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb'), spaceBefore=8, spaceAfter=8))
    story.append(Paragraph("THE TENANT HEREBY AGREES TO:", section_style))
    tenant_obs = [
        ("Keep Premises Clean","Maintain the premises in good order at own expense and return them in the same condition upon termination, fair wear and tear excepted."),
        ("Residential Use Only","Use the premises strictly for residential purposes only. No trade or business of any kind shall be conducted."),
        ("No Subletting","Not to assign, sublet, or part with possession without prior written consent from the Landlord."),
        ("No Alterations","Not to make alterations or drive fasteners into walls, floors, or ceilings without written consent."),
        ("No Charcoal or Wood","Not to use charcoal or firewood for cooking inside the house at any time."),
        ("Report Defects","Report immediately in writing any structural defects, pest infestations, or signs of rot."),
        ("No Nuisance","Not to permit any act which may be a nuisance to neighbors or detrimental to the Landlord reputation."),
        ("Damage Responsibility","Be responsible for all damages and replace any items lost, broken, or damaged during tenancy."),
        ("Estate Fees","Pay the required garbage fee, security fee, and any other estate levies."),
        ("Welfare Meetings","Attend welfare meetings within the estate as required and cooperate with neighbors."),
        ("Pre-departure Painting","One month before expiration, professionally paint the premises with two coats to the Landlord satisfaction."),
        ("Handover Condition","Yield up the premises in good order with all fittings, fixtures, and equipment intact."),
    ]
    for i, (t, d) in enumerate(tenant_obs):
        rdata = [[Paragraph(f"{i+1}. {t}", ParagraphStyle('OT',parent=styles['Normal'],fontSize=9,fontName='Helvetica-Bold',textColor=colors.HexColor('#0d9488'))), Paragraph(d, clause_style)]]
        rt = Table(rdata, colWidths=[3.5*cm,13*cm])
        rt.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#fafafa') if i%2==0 else colors.white)]))
        story.append(rt)

    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb'), spaceBefore=8, spaceAfter=8))
    story.append(Paragraph("THE LANDLORD AGREES TO:", section_style))
    landlord_obs = [
        "Allow the Tenant to quietly possess and enjoy the premises without unlawful interruption.",
        "Keep the outside walls, roof, and main structure in good repair.",
        "Pay rates and land rent in respect of the premises.",
        "Give the Tenant first option to renew the lease for a further 12 months with 3 months prior written notice, provided no breach of lease terms.",
        "Take action, including repossession, if rent is in arrears for more than 10 days or if the Tenant fails to observe any covenant herein.",
    ]
    for i, obs in enumerate(landlord_obs):
        story.append(Paragraph(f"{i+1}. {obs}", clause_style))

    story.append(Spacer(1,20))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0d9488'), spaceAfter=16))
    story.append(Paragraph("SIGNATURES", section_style))
    story.append(Paragraph("By signing below, both parties confirm they have read, understood, and agree to all terms of this Tenancy Agreement.", body_style))
    story.append(Spacer(1,16))

    sig = [
        [Paragraph("<b>TENANT</b>", ParagraphStyle('SH2',parent=styles['Normal'],fontSize=10,fontName='Helvetica-Bold',textColor=colors.HexColor('#374151'),alignment=1)), Paragraph("<b>LANDLORD / AGENT</b>", ParagraphStyle('SH3',parent=styles['Normal'],fontSize=10,fontName='Helvetica-Bold',textColor=colors.HexColor('#374151'),alignment=1))],
        [Paragraph(f"<b>Name:</b> {tenant_name}", body_style), Paragraph("<b>Name:</b> LEA Executive Management", body_style)],
        [Paragraph(f"<b>ID No:</b> {tenant_id or 'To be provided'}", body_style), Paragraph("<b>Designation:</b> Property Manager", body_style)],
        [Paragraph("<b>Signature:</b> _________________________", body_style), Paragraph("<b>Signature:</b> _________________________", body_style)],
        [Paragraph(f"<b>Date:</b> {date_str}", body_style), Paragraph("<b>Date:</b> _________________________", body_style)],
    ]
    st = Table(sig, colWidths=[8.25*cm,8.25*cm])
    st.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#f0fdf4')),('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#e5e7eb')),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('VALIGN',(0,0),(-1,-1),'TOP'),('ALIGN',(0,0),(-1,0),'CENTER')]))
    story.append(st)
    story.append(Spacer(1,16))
    story.append(Paragraph(f"Digitally generated by LEA Executive Residency System on {date_str} | Tenant: {tenant_name} | Email: {tenant_email}", footer_style))
    doc.build(story)
    return base64.b64encode(buffer.getvalue()).decode()

print(generate("""${tenantName.replace(/"/g, '\\"')}""", """${(tenantId || '').replace(/"/g, '\\"')}""", """${tenantEmail.replace(/"/g, '\\"')}""", """${dateStr}"""))
`

  try {
    const result = execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    }).toString().trim()

    const pdfBuffer = Buffer.from(result, 'base64')

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="LEA_Tenancy_Agreement_${tenantName.replace(/\s+/g, '_')}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (err: any) {
    console.error('PDF generation error:', err.message)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}