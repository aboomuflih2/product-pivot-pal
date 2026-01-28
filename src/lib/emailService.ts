/**
 * Email Service for 911 Clothings
 * Sends order emails via the Express email-api service
 */

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

// Email API URL - use environment variable or fallback to localhost for development
const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || 'http://localhost:3001';

/**
 * Send both customer and admin emails for a new order
 * Uses Express email-api service
 */
export async function sendOrderEmails(data: OrderEmailData): Promise<{ customer: boolean; admin: boolean }> {
  try {
    console.log('Sending order emails via Express API...');
    console.log('Email API URL:', EMAIL_API_URL);

    const response = await fetch(`${EMAIL_API_URL}/send-order-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Email API error:', error);
      return { customer: false, admin: false };
    }

    const result = await response.json();
    console.log('Email results:', result);
    return {
      customer: result.customer || false,
      admin: result.admin || false,
    };
  } catch (error) {
    console.error('Failed to send order emails:', error);
    return { customer: false, admin: false };
  }
}

export type { OrderEmailData, OrderItem, ShippingAddress };
