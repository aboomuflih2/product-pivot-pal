import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminRoute from "@/components/auth/AdminRoute";
import AdminNav from "@/components/admin/AdminNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Phone, Mail } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  tracking_number: string | null;
  user_id: string;
  payment_method: string | null;
  payment_status: string | null;
  payment_proof_url: string | null;
  shipping_address_id: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  variant_color: string | null;
  variant_size: string | null;
}

const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newStatus, setNewStatus] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const [shippingAddress, setShippingAddress] = useState<any | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    full_name: "",
    phone: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [statusFilter, orders]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    if (statusFilter === "all") {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === statusFilter));
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (error) throw error;
      setOrderItems(data || []);
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  const fetchShippingAddress = async (addressId: string | null) => {
    try {
      if (!addressId) {
        setShippingAddress(null);
        return;
      }
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("id", addressId)
        .maybeSingle();
      if (error) throw error;
      setShippingAddress(data || null);
    } catch (error) {
      console.error("Error fetching shipping address:", error);
      setShippingAddress(null);
    }
  };

  const fetchCustomerEmail = async (userId: string) => {
    try {
      // Fetch email from profiles table (if stored there) or use RPC
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      // Since email is in auth.users, we need to get it from there via RPC or store it
      // For now, we'll check if the user has a profile and use the order's user_id
      // This will be fetched via the get_all_users_for_admin RPC if needed
      if (error) throw error;

      // Try to get email from user_roles or profiles
      // @ts-ignore - RPC is defined in database but not in generated types
      const { data: userData } = await supabase.rpc('get_all_users_for_admin');
      if (userData && Array.isArray(userData)) {
        const user = userData.find((u: any) => u.user_id === userId);
        if (user) {
          setCustomerEmail(user.email);
          return;
        }
      }
      setCustomerEmail(null);
    } catch (error) {
      console.error("Error fetching customer email:", error);
      setCustomerEmail(null);
    }
  };

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setTrackingNumber(order.tracking_number || "");
    await fetchOrderDetails(order.id);
    await fetchShippingAddress(order.shipping_address_id || null);
    await fetchCustomerEmail(order.user_id);
    setDialogOpen(true);
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    try {
      const updateData: any = { status: newStatus };

      if (newStatus === "shipped" && trackingNumber) {
        updateData.tracking_number = trackingNumber;
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", selectedOrder.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order updated successfully",
      });

      setDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    }
  };

  const handleVerifyPayment = async (approved: boolean) => {
    if (!selectedOrder) return;
    setVerifying(true);
    try {
      const updateData: any = {
        payment_status: approved ? "verified" : "rejected",
      };
      if (approved && selectedOrder.status === "pending") {
        updateData.status = "processing";
      }
      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", selectedOrder.id);
      if (error) throw error;
      toast({ title: approved ? "Payment verified" : "Payment rejected" });
      setDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast({ title: "Error", description: "Failed to update payment", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!selectedOrder) return;

    // Validate required fields
    if (!addressForm.full_name || !addressForm.phone || !addressForm.address_line_1 ||
      !addressForm.city || !addressForm.state || !addressForm.postal_code) {
      toast({
        title: "Error",
        description: "Please fill in all required address fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create new address for the order's user
      const { data: newAddress, error: addressError } = await supabase
        .from("addresses")
        .insert({
          user_id: selectedOrder.user_id,
          label: "Order Address",
          full_name: addressForm.full_name,
          phone: addressForm.phone,
          address_line_1: addressForm.address_line_1,
          address_line_2: addressForm.address_line_2 || null,
          city: addressForm.city,
          state: addressForm.state,
          postal_code: addressForm.postal_code,
          country: "India",
          is_default: false,
        })
        .select()
        .single();

      if (addressError) throw addressError;

      // Update the order with the new address
      const { error: orderError } = await supabase
        .from("orders")
        .update({ shipping_address_id: newAddress.id })
        .eq("id", selectedOrder.id);

      if (orderError) throw orderError;

      toast({
        title: "Success",
        description: "Shipping address saved successfully",
      });

      // Refresh the address display
      setShippingAddress(newAddress);
      setEditingAddress(false);
      fetchOrders();
    } catch (error) {
      console.error("Error saving address:", error);
      toast({
        title: "Error",
        description: "Failed to save address",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      processing: "secondary",
      shipped: "default",
      delivered: "default",
      cancelled: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <AdminRoute>
      <div className="min-h-screen flex flex-col">
        <Header />
        <AdminNav />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Order Management</h1>

            <div className="flex gap-4 mb-6">
              <div className="w-64">
                <Label>Filter by Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading orders...</div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Orders ({filteredOrders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>{format(new Date(order.created_at), "MMM dd, yyyy")}</TableCell>
                          <TableCell>₹{Number(order.total_amount).toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{order.tracking_number || "-"}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{(order.payment_method || "").toUpperCase()}</div>
                              <div className="text-muted-foreground">{order.payment_status || "-"}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrder(order)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </main>
        <Footer />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Order Date</Label>
                    <p className="text-sm">{format(new Date(selectedOrder.created_at), "PPP")}</p>
                  </div>
                  <div>
                    <Label>Total Amount</Label>
                    <p className="text-sm font-medium">₹{Number(selectedOrder.total_amount).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>Shipping Address</Label>
                    {!editingAddress && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingAddress(true);
                          if (shippingAddress) {
                            setAddressForm({
                              full_name: shippingAddress.full_name || "",
                              phone: shippingAddress.phone || "",
                              address_line_1: shippingAddress.address_line_1 || "",
                              address_line_2: shippingAddress.address_line_2 || "",
                              city: shippingAddress.city || "",
                              state: shippingAddress.state || "",
                              postal_code: shippingAddress.postal_code || "",
                            });
                          } else {
                            setAddressForm({
                              full_name: "",
                              phone: "",
                              address_line_1: "",
                              address_line_2: "",
                              city: "",
                              state: "",
                              postal_code: "",
                            });
                          }
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        {shippingAddress ? "Edit" : "Add Address"}
                      </Button>
                    )}
                  </div>
                  <div className="mt-2 p-3 border rounded">
                    {editingAddress ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Full Name *</Label>
                            <Input
                              value={addressForm.full_name}
                              onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                              placeholder="Full Name"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Phone *</Label>
                            <Input
                              value={addressForm.phone}
                              onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                              placeholder="Phone Number"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Address Line 1 *</Label>
                          <Input
                            value={addressForm.address_line_1}
                            onChange={(e) => setAddressForm({ ...addressForm, address_line_1: e.target.value })}
                            placeholder="Street Address"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Address Line 2</Label>
                          <Input
                            value={addressForm.address_line_2}
                            onChange={(e) => setAddressForm({ ...addressForm, address_line_2: e.target.value })}
                            placeholder="Apartment, suite, etc. (optional)"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">City *</Label>
                            <Input
                              value={addressForm.city}
                              onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                              placeholder="City"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">State *</Label>
                            <Input
                              value={addressForm.state}
                              onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                              placeholder="State"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Postal Code *</Label>
                            <Input
                              value={addressForm.postal_code}
                              onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                              placeholder="PIN Code"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" onClick={handleSaveAddress}>Save Address</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingAddress(false)}>Cancel</Button>
                        </div>
                      </div>
                    ) : shippingAddress ? (
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{shippingAddress.full_name}</p>
                        <p className="text-muted-foreground">
                          {shippingAddress.address_line_1}
                          {shippingAddress.address_line_2 ? `, ${shippingAddress.address_line_2}` : ""}
                        </p>
                        <p className="text-muted-foreground">
                          {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postal_code}
                        </p>
                        <div className="flex items-center gap-4 pt-2">
                          {shippingAddress.phone && (
                            <a
                              href={`tel:${shippingAddress.phone}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Phone className="h-4 w-4" />
                              {shippingAddress.phone}
                            </a>
                          )}
                          {customerEmail && (
                            <a
                              href={`mailto:${customerEmail}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Mail className="h-4 w-4" />
                              {customerEmail}
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No address available - Click "Add Address" to add one</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Method</Label>
                    <p className="text-sm">{selectedOrder.payment_method || "-"}</p>
                  </div>
                  <div>
                    <Label>Payment Status</Label>
                    <p className="text-sm">{selectedOrder.payment_status || "-"}</p>
                  </div>
                </div>

                {selectedOrder.payment_method === "upi" && selectedOrder.payment_proof_url && (
                  <div>
                    <Label>Payment Proof</Label>
                    <div className="mt-2">
                      <a
                        href={selectedOrder.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="block"
                      >
                        <img
                          src={selectedOrder.payment_proof_url}
                          alt="Payment proof"
                          className="max-h-64 rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        />
                        <p className="text-sm text-muted-foreground mt-1">Click image to download</p>
                      </a>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button onClick={() => handleVerifyPayment(true)} disabled={verifying}>Verify Payment</Button>
                      <Button variant="outline" onClick={() => handleVerifyPayment(false)} disabled={verifying}>Reject</Button>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Order Items</Label>
                  <div className="mt-2 space-y-2">
                    {orderItems.map((item) => (
                      <div key={item.id} className="p-3 border rounded-lg">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} × ₹{Number(item.unit_price).toLocaleString()}
                        </p>
                        {(item.variant_color || item.variant_size) && (
                          <p className="text-sm text-muted-foreground">
                            {item.variant_color && `Color: ${item.variant_color}`}
                            {item.variant_color && item.variant_size && " | "}
                            {item.variant_size && `Size: ${item.variant_size}`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Update Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newStatus === "shipped" && (
                  <div>
                    <Label>Tracking Number</Label>
                    <Input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      className="mt-2"
                    />
                  </div>
                )}

                <Button onClick={handleUpdateOrder} className="w-full">
                  Update Order
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminRoute>
  );
};

export default OrderManagement;
