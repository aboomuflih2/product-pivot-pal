import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZEPTOMAIL_API_URL = 'https://api.zeptomail.com/v1.1/email';
const ZEPTOMAIL_API_KEY = Deno.env.get('ZEPTOMAIL_API_KEY') || '';
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || '911clothings@gmail.com';
const SENDER_EMAIL = 'noreply@911clothings.com';
const SENDER_NAME = '911 Clothings';

interface OrderItem {
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    variant_color?: string | null;
    variant_size?: string | null;
}

interface ShippingAddress {
    full_name: string;
    phone: string;
    address_line_1: string;
    address_line_2?: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
}

interface OrderEmailData {
    orderNumber: string;
    orderDate: string;
    customerName: string;
    customerEmail: string;
    paymentMethod: 'upi' | 'cod';
    paymentStatus: string;
    totalAmount: number;
    items: OrderItem[];
    shippingAddress: ShippingAddress;
}

function formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

async function sendEmail(to: { email: string; name: string }, subject: string, htmlBody: string): Promise<boolean> {
    if (!ZEPTOMAIL_API_KEY) {
        console.error('ZeptoMail API key not configured');
        return false;
    }

    try {
        const response = await fetch(ZEPTOMAIL_API_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Zoho-enczapikey ${ZEPTOMAIL_API_KEY}`,
            },
            body: JSON.stringify({
                from: {
                    address: SENDER_EMAIL,
                    name: SENDER_NAME,
                },
                to: [
                    {
                        email_address: {
                            address: to.email,
                            name: to.name,
                        },
                    },
                ],
                subject,
                htmlbody: htmlBody,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('ZeptoMail API error:', error);
            return false;
        }

        console.log(`Email sent successfully to ${to.email}`);
        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        return false;
    }
}

function generateCustomerEmailHtml(data: OrderEmailData): string {
    const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        ${item.product_name}
        ${item.variant_color ? `<br><small style="color: #666;">Color: ${item.variant_color}</small>` : ''}
        ${item.variant_size ? `<br><small style="color: #666;">Size: ${item.variant_size}</small>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.total_price)}</td>
    </tr>
  `).join('');

    const paymentMethodLabel = data.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI Payment';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">911 Clothings</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Order Confirmation</p>
    </div>
    <div style="padding: 30px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 48px;">🎉</div>
        <h2 style="color: #333; margin: 15px 0 10px 0;">Thank You, ${data.customerName}!</h2>
        <p style="color: #666; margin: 0;">Your order has been confirmed.</p>
      </div>
      <div style="background-color: #f8f8f8; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Order Number:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">#${data.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Order Date:</td>
            <td style="padding: 8px 0; text-align: right; color: #333;">${formatDate(data.orderDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Payment Method:</td>
            <td style="padding: 8px 0; text-align: right; color: #333;">${paymentMethodLabel}</td>
          </tr>
        </table>
      </div>
      <h3 style="color: #333; border-bottom: 2px solid #ec4899; padding-bottom: 10px;">Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f8f8f8;">
            <th style="padding: 12px; text-align: left; color: #666;">Product</th>
            <th style="padding: 12px; text-align: center; color: #666;">Qty</th>
            <th style="padding: 12px; text-align: right; color: #666;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 15px 12px; text-align: right; font-weight: bold; font-size: 18px;">Total:</td>
            <td style="padding: 15px 12px; text-align: right; font-weight: bold; font-size: 18px; color: #ec4899;">${formatCurrency(data.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
      <h3 style="color: #333; border-bottom: 2px solid #ec4899; padding-bottom: 10px;">Shipping Address</h3>
      <div style="background-color: #f8f8f8; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <p style="margin: 0; line-height: 1.6;">
          <strong>${data.shippingAddress.full_name}</strong><br>
          ${data.shippingAddress.address_line_1}<br>
          ${data.shippingAddress.address_line_2 ? data.shippingAddress.address_line_2 + '<br>' : ''}
          ${data.shippingAddress.city}, ${data.shippingAddress.state} - ${data.shippingAddress.postal_code}<br>
          ${data.shippingAddress.country}<br>
          <strong>Phone:</strong> ${data.shippingAddress.phone}
        </p>
      </div>
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
        <p style="margin: 0; color: #856404;">
          <strong>⏳ What's Next?</strong><br>
          Once payment is verified by 911 Clothings, we will dispatch your order to your address.
        </p>
      </div>
    </div>
    <div style="background-color: #333; color: #fff; padding: 25px; text-align: center;">
      <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold;">911 Clothings</p>
      <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">
        Thank you for shopping with us!<br>
        <a href="https://911clothings.com" style="color: #ec4899;">www.911clothings.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function generateAdminEmailHtml(data: OrderEmailData): string {
    const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.product_name}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.variant_color || '-'} / ${item.variant_size || '-'}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.unit_price)}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.total_price)}</td>
    </tr>
  `).join('');

    const paymentMethodLabel = data.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI Payment';
    const paymentStatusColor = data.paymentStatus === 'submitted' ? '#28a745' : '#ffc107';

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background-color: #1a1a2e; padding: 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0;">🛒 New Order Received</h1>
    </div>
    <div style="padding: 25px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 10px; background-color: #f8f8f8; font-weight: bold;">Order Number:</td>
          <td style="padding: 10px; background-color: #f8f8f8; font-size: 18px; color: #ec4899;">#${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 10px;">Order Date:</td>
          <td style="padding: 10px;">${formatDate(data.orderDate)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; background-color: #f8f8f8;">Payment Method:</td>
          <td style="padding: 10px; background-color: #f8f8f8;">${paymentMethodLabel}</td>
        </tr>
        <tr>
          <td style="padding: 10px;">Payment Status:</td>
          <td style="padding: 10px;">
            <span style="background-color: ${paymentStatusColor}; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 12px;">${data.paymentStatus.toUpperCase()}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px; background-color: #f8f8f8; font-weight: bold;">Total Amount:</td>
          <td style="padding: 10px; background-color: #f8f8f8; font-size: 20px; font-weight: bold; color: #28a745;">${formatCurrency(data.totalAmount)}</td>
        </tr>
      </table>
      <h3 style="border-bottom: 2px solid #1a1a2e; padding-bottom: 10px;">👤 Customer Information</h3>
      <table style="width: 100%; margin-bottom: 20px;">
        <tr><td style="padding: 8px 0;"><strong>Name:</strong></td><td>${data.customerName}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Email:</strong></td><td><a href="mailto:${data.customerEmail}">${data.customerEmail}</a></td></tr>
        <tr><td style="padding: 8px 0;"><strong>Phone:</strong></td><td>${data.shippingAddress.phone}</td></tr>
      </table>
      <h3 style="border-bottom: 2px solid #1a1a2e; padding-bottom: 10px;">📦 Shipping Address</h3>
      <div style="background-color: #f8f8f8; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <p style="margin: 0; line-height: 1.6;">
          ${data.shippingAddress.full_name}<br>
          ${data.shippingAddress.address_line_1}<br>
          ${data.shippingAddress.address_line_2 ? data.shippingAddress.address_line_2 + '<br>' : ''}
          ${data.shippingAddress.city}, ${data.shippingAddress.state} - ${data.shippingAddress.postal_code}<br>
          ${data.shippingAddress.country}
        </p>
      </div>
      <h3 style="border-bottom: 2px solid #1a1a2e; padding-bottom: 10px;">📋 Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #1a1a2e; color: #fff;">
            <th style="padding: 12px; text-align: left;">Product</th>
            <th style="padding: 12px; text-align: center;">Variant</th>
            <th style="padding: 12px; text-align: center;">Qty</th>
            <th style="padding: 12px; text-align: right;">Unit Price</th>
            <th style="padding: 12px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://911clothings.com/admin/orders" style="display: inline-block; background-color: #ec4899; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Order in Admin Panel</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const data: OrderEmailData = await req.json();

        // Send customer email
        const customerSubject = `Order Confirmed - #${data.orderNumber}`;
        const customerHtml = generateCustomerEmailHtml(data);
        const customerResult = await sendEmail(
            { email: data.customerEmail, name: data.customerName },
            customerSubject,
            customerHtml
        );

        // Send admin email
        const adminSubject = `🛒 New Order Received - #${data.orderNumber}`;
        const adminHtml = generateAdminEmailHtml(data);
        const adminResult = await sendEmail(
            { email: ADMIN_EMAIL, name: '911 Clothings Admin' },
            adminSubject,
            adminHtml
        );

        return new Response(
            JSON.stringify({
                success: true,
                customer: customerResult,
                admin: adminResult
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error in send-order-emails function:', error);
        return new Response(
            JSON.stringify({ success: false, error: String(error) }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
