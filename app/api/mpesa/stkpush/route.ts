// app/api/mpesa/stkpush/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[STK Push] Request body:", body);

    const { amount, phone, tenantId, month } = body;

    if (!amount || !phone || !tenantId || !month) {
      return NextResponse.json(
        { error: "Missing required fields: amount, phone, tenantId, month" },
        { status: 400 }
      );
    }

    // Format phone to 254XXXXXXXXX
    let formattedPhone = phone.replace(/^0+/, "");
    if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    // Get access token
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    console.log("[STK Push] Requesting token...");
    let tokenRes;
    try {
      tokenRes = await axios.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        {
          headers: { Authorization: `Basic ${auth}` },
        }
      );
    } catch (tokenError: any) {
      console.error("[STK Push] Token error:", tokenError.response?.data || tokenError.message);
      return NextResponse.json(
        { error: "Failed to get access token", details: tokenError.response?.data || tokenError.message },
        { status: 500 }
      );
    }

    const accessToken = tokenRes.data.access_token;

    // Prepare STK push payload
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, -3);
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.MPESA_STK_CALLBACK_URL,
      AccountReference: `Rent-${tenantId}-${month}`,
      TransactionDesc: `Rent payment for ${month}`,
    };

    console.log("[STK Push] Sending STK push...");
    let stkRes;
    try {
      stkRes = await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        payload,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch (stkError: any) {
      console.error("[STK Push] STK error:", stkError.response?.data || stkError.message);
      return NextResponse.json(
        { error: "STK push request failed", details: stkError.response?.data || stkError.message },
        { status: 500 }
      );
    }

    console.log("[STK Push] Success:", stkRes.data);
    return NextResponse.json(stkRes.data);
  } catch (err: any) {
    console.error("[STK Push] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}