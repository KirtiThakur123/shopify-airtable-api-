
export default async function handler(req, res) {
  // Allow POST requests only
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST."
    });
  }

  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;

  if (!token || !baseId || !tableName) {
    return res.status(500).json({
      success: false,
      message: "Missing Airtable environment variables."
    });
  }

  try {
    const body = req.body;

    const confirmationNumber =
      body["Confirmation Number"] ||
      body["Warrenty Number"] ||
      body["Warranty Number"] ||
      "";

    const fields = {
      "Confirmation Number": confirmationNumber,
      "Full Name": body["Full Name"] || "",
      "Email": body["Email"] || "",
      "Selected Tool": body["Selected Tool"] || "",
    };

    const purchaseDate =
      body["Day of Purchase"] ||
      body["Day of purchase"] ||
      body["Date"] ||
      "";

    if (purchaseDate) {
      fields["Day of Purchase"] = purchaseDate;
    }

    const receipt = body["Proof of Purchase"] ||
      body["Attachment"] ||
      body["RECEIPT PROOF"] ||
      "";

    if (Array.isArray(receipt)) {
      fields["Proof of Purchase"] = receipt
        .filter(item => item && item.url)
        .map(item => ({ url: item.url }));
    } else if (
      typeof receipt === "string" &&
      /^https?:\/\//i.test(receipt)
    ) {
      fields["Proof of Purchase"] = [{ url: receipt }];
    }

    if (!confirmationNumber) {
      return res.status(400).json({
        success: false,
        message: "Confirmation Number is required."
      });
    }

    const airtableUrl =
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;

    const response = await fetch(airtableUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fields })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Airtable error:", result);

      return res.status(response.status).json({
        success: false,
        message: "Airtable could not save the record.",
        error: result.error?.message || "Please check your Airtable setup."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Registration saved successfully.",
      id: result.id
    });
  } catch (error) {
    console.error("API error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while saving registration."
    });
  }
}
