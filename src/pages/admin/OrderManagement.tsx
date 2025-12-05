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

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setTrackingNumber(order.tracking_number || "");
    await fetchOrderDetails(order.id);
    await fetchShippingAddress(order.shipping_address_id || null);
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
                  <Label>Shipping Address</Label>
                  <div className="mt-2 p-3 border rounded">
                    {shippingAddress ? (
                      <div className="text-sm">
                        <p className="font-medium">{shippingAddress.full_name}</p>
                        <p className="text-muted-foreground">
                          {shippingAddress.address_line_1}
                          {shippingAddress.address_line_2 ? `, ${shippingAddress.address_line_2}` : ""}
                        </p>
                        <p className="text-muted-foreground">
                          {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postal_code}
                        </p>
                        <p>{shippingAddress.phone}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No address available</p>
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
                      <img src={selectedOrder.payment_proof_url} alt="Payment proof" className="max-h-64 rounded border" />
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
