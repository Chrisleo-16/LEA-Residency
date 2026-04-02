import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[STK Push Callback]", JSON.stringify(body, null, 2));

    const { Body } = body;
    const resultCode = Body?.stkCallback?.ResultCode;
    const resultDesc = Body?.stkCallback?.ResultDesc;
    const callbackMetadata = Body?.stkCallback?.CallbackMetadata?.Item;

    if (resultCode !== 0) {
      console.log("Payment failed:", resultDesc);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
    }

    // Extract transaction details
    const amountItem = callbackMetadata.find((i: any) => i.Name === "Amount");
    const mpesaCodeItem = callbackMetadata.find(
      (i: any) => i.Name === "MpesaReceiptNumber"
    );
    const phoneItem = callbackMetadata.find(
      (i: any) => i.Name === "PhoneNumber"
    );

    const amount = amountItem?.Value;
    const mpesaCode = mpesaCodeItem?.Value;
    const phoneNumber = phoneItem?.Value;

    // Extract tenantId and month from AccountReference
    const accountRef = Body?.stkCallback?.AccountReference;
    const match = accountRef.match(/Rent-(.+)-(.+)/);
    if (!match) {
      throw new Error("Invalid AccountReference format");
    }
    const tenantId = match[1];
    const paymentMonth = match[2];

    // Check for duplicate
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("mpesa_code", mpesaCode)
      .maybeSingle();

    if (existing) {
      console.log("Duplicate STK payment ignored:", mpesaCode);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
    }

    // Get landlord id (any landlord)
    const { data: landlord } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "landlord")
      .limit(1)
      .single();

    // Check if rent setting exists
    const { data: rentSetting } = await supabase
      .from("rent_settings")
      .select("monthly_amount")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    let isComplete = false;
    let pendingAmount = 0;
    if (rentSetting) {
      const { data: existingPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("tenant_id", tenantId)
        .eq("payment_month", paymentMonth);

      const alreadyPaid = (existingPayments || []).reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const totalAfterThis = alreadyPaid + amount;
      isComplete = totalAfterThis >= rentSetting.monthly_amount;
      pendingAmount = Math.max(0, rentSetting.monthly_amount - totalAfterThis);
    }

    // Insert payment
    const { error: insertError } = await supabase.from("payments").insert({
      tenant_id: tenantId,
      landlord_id: landlord?.id || null,
      amount,
      phone_number: phoneNumber,
      mpesa_code: mpesaCode,
      payment_month: paymentMonth,
      payment_method: "mpesa",
      logged_by: "system",
      status: isComplete ? "complete" : "partial",
      notes: pendingAmount > 0 ? `KES ${pendingAmount} still pending` : null,
    });

    if (insertError) {
      console.error("Insert error:", insertError.message);
      return NextResponse.json(
        { ResultCode: "C2B00016", ResultDesc: "Failed to save" },
        { status: 500 }
      );
    }

    console.log(
      `✅ STK Payment: ${mpesaCode} | KES ${amount} | ${phoneNumber} | ${isComplete ? "COMPLETE" : "PARTIAL"}`
    );

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (err: any) {
    console.error("STK Callback error:", err.message);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
  }
}