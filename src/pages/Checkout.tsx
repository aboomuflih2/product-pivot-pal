import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/functions";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Loader2, Upload, Copy } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const addressSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  address_line_1: z.string().min(5, "Address is required"),
  address_line_2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postal_code: z.string().min(6, "Valid postal code required"),
  country: z.string().default("India"),
});

type AddressForm = z.infer<typeof addressSchema>;

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cod">("upi");
  const [upiDetails, setUpiDetails] = useState<any>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [orderData, setOrderData] = useState<any>(null);

  const form = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "India",
    },
  });

  useEffect(() => {
    if (items.length === 0) {
      navigate("/cart");
    }
    loadSavedAddresses();
    loadUPIDetails();
  }, []);

  const loadSavedAddresses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });

    if (!error && data) {
      setSavedAddresses(data);
      if (data.length > 0 && !selectedAddress) {
        setSelectedAddress(data[0].id);
      }
    }
  };

  const loadUPIDetails = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-payment-settings');
      if (!error && data && !data.error) {
        setUpiDetails(data);
        return;
      }
    } catch (_) {}

    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('upi_id, upi_qr_code_url, upi_number')
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        setUpiDetails(data);
        return;
      }
    } catch (_) {}

    setUpiDetails(null);
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: `${label} copied to clipboard` });
    } catch {
      toast({ title: "Error", description: `Failed to copy ${label}`, variant: "destructive" });
    }
  };

  const handleAddressSubmit = async (values: AddressForm) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const addressData = {
        full_name: values.full_name,
        phone: values.phone,
        address_line_1: values.address_line_1,
        address_line_2: values.address_line_2 || "",
        city: values.city,
        state: values.state,
        postal_code: values.postal_code,
        country: values.country,
        user_id: user.id,
        label: "Checkout Address",
        is_default: false,
      };

      const { data, error } = await supabase
        .from("addresses")
        .insert([addressData])
        .select()
        .single();

      if (error) throw error;

      setSelectedAddress(data.id);
      setStep(2);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast({
        title: "Error",
        description: "Please select a shipping address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Prepare cart items for validation
      const orderItems = items.map(item => ({
        productId: item.id,
        variantId: item.id,
        quantity: item.quantity,
        color: item.variant?.color,
        size: item.variant?.size,
      }));

      // Call secure edge function to create order with price validation (with fallback)
      let { data, error } = await invokeFunction('create-order', {
        items: orderItems,
        shippingAddressId: selectedAddress,
        paymentMethod: paymentMethod,
      });

      if (error) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('place_order', {
          items: orderItems as any,
          shipping_address_id: selectedAddress,
          payment_method: paymentMethod,
        });
        if (rpcError) throw rpcError;
        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        data = { success: true, orderId: row?.order_id, orderNumber: row?.order_number } as any;
        error = undefined;
      }

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Fetch the created order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select()
        .eq("id", data.orderId)
        .single();

      if (orderError) throw orderError;

      setOrderData(order);

      if (paymentMethod === "upi") {
        if (paymentProof) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Not authenticated");
          const fileExt = paymentProof.name.split(".").pop();
          const fileName = `${user.id}/${order.id}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("payment-proofs")
            .upload(fileName, paymentProof);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage
            .from("payment-proofs")
            .getPublicUrl(fileName);
          const { error: updateError } = await supabase
            .from("orders")
            .update({ payment_proof_url: publicUrl, payment_status: "submitted" })
            .eq("id", order.id);
          if (updateError) throw updateError;
          clearCart();
          navigate("/account/orders");
          toast({ title: "Order placed!", description: "Payment proof uploaded for verification" });
        } else {
          setStep(3);
        }
      } else {
        clearCart();
        navigate("/account/orders");
        toast({
          title: "Order placed successfully!",
          description: "Your order has been placed with Cash on Delivery",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to place order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentProofUpload = async () => {
    if (!paymentProof || !orderData) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = paymentProof.name.split(".").pop();
      const fileName = `${user.id}/${orderData.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, paymentProof);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("orders")
        .update({ payment_proof_url: publicUrl, payment_status: "submitted" })
        .eq("id", orderData.id);

      if (updateError) throw updateError;

      clearCart();
      navigate("/account/orders");
      toast({
        title: "Payment proof uploaded!",
        description: "Your order will be verified by admin",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Checkout</h1>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > s ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Shipping Address */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                {savedAddresses.length > 0 && !useNewAddress ? (
                  <div className="space-y-4">
                    <RadioGroup value={selectedAddress || ""} onValueChange={setSelectedAddress}>
                      {savedAddresses.map((addr) => (
                        <div key={addr.id} className="flex items-start space-x-3 p-4 border rounded">
                          <RadioGroupItem value={addr.id} id={addr.id} />
                          <Label htmlFor={addr.id} className="flex-1 cursor-pointer">
                            <div className="font-semibold">{addr.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {addr.address_line_1}, {addr.address_line_2 && `${addr.address_line_2}, `}
                              {addr.city}, {addr.state} - {addr.postal_code}
                            </div>
                            <div className="text-sm">{addr.phone}</div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <Button variant="outline" onClick={() => setUseNewAddress(true)}>
                      Add New Address
                    </Button>
                    <Button className="w-full" onClick={() => setStep(2)} disabled={!selectedAddress}>
                      Continue
                    </Button>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddressSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="address_line_1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 1</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="address_line_2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 2 (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Continue
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Payment Method & Order Summary */}
          {step === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                    <div className="flex items-center space-x-3 p-4 border rounded">
                      <RadioGroupItem value="upi" id="upi" />
                      <Label htmlFor="upi" className="flex-1 cursor-pointer">
                        <div className="font-semibold">UPI Payment</div>
                        <div className="text-sm text-muted-foreground">
                          Pay using UPI QR Code
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 border rounded">
                      <RadioGroupItem value="cod" id="cod" />
                      <Label htmlFor="cod" className="flex-1 cursor-pointer">
                        <div className="font-semibold">Cash on Delivery</div>
                        <div className="text-sm text-muted-foreground">
                          Pay when you receive
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                  {paymentMethod === "upi" && (
                    <div className="mt-6 p-4 border rounded">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold">UPI Payment Details</p>
                        <span className="text-sm text-muted-foreground">Amount: ₹{totalPrice.toFixed(2)}</span>
                      </div>
                      {upiDetails ? (
                        <>
                          {upiDetails.upi_qr_code_url && (
                            <img
                              src={upiDetails.upi_qr_code_url}
                              alt="UPI QR Code"
                              className="mx-auto max-w-xs rounded border mb-4"
                            />
                          )}
                          <div className="grid sm:grid-cols-2 gap-3">
                            {upiDetails.upi_id && (
                              <div className="flex items-center justify-between p-3 border rounded">
                                <div>
                                  <p className="text-xs text-muted-foreground">UPI ID</p>
                                  <p className="font-mono text-sm">{upiDetails.upi_id}</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyText(upiDetails.upi_id, "UPI ID")}
                                >
                                  <Copy className="h-4 w-4 mr-1" /> Copy
                                </Button>
                              </div>
                            )}
                            {upiDetails.upi_number && (
                              <div className="flex items-center justify-between p-3 border rounded">
                                <div>
                                  <p className="text-xs text-muted-foreground">UPI Number</p>
                                  <p className="font-mono text-sm">{upiDetails.upi_number}</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyText(upiDetails.upi_number, "UPI Number")}
                                >
                                  <Copy className="h-4 w-4 mr-1" /> Copy
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="mt-6 space-y-3">
                            <p className="text-sm text-muted-foreground">Upload payment screenshot now (optional)</p>
                            <div className="border-2 border-dashed rounded-lg p-4 text-center">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                                className="hidden"
                                id="payment-proof-step2"
                              />
                              <Label htmlFor="payment-proof-step2" className="cursor-pointer inline-flex items-center gap-2">
                                <Upload className="h-5 w-5 text-muted-foreground" />
                                <span className="font-semibold">
                                  {paymentProof ? paymentProof.name : "Click to upload screenshot"}
                                </span>
                              </Label>
                              <p className="text-xs text-muted-foreground mt-2">PNG, JPG up to 10MB</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">UPI details are not configured. Please choose Cash on Delivery.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>
                          {item.name} x {item.quantity}
                        </span>
                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>₹{totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-6"
                    onClick={handlePlaceOrder}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Place Order
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Payment Proof Upload (UPI only) */}
          {step === 3 && paymentMethod === "upi" && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Payment Proof</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {upiDetails && (
                  <div className="text-center">
                    <p className="mb-4 text-muted-foreground">
                      Scan the QR code below to pay ₹{totalPrice.toFixed(2)}
                    </p>
                    {upiDetails.upi_qr_code_url && (
                      <img
                        src={upiDetails.upi_qr_code_url}
                        alt="UPI QR Code"
                        className="mx-auto max-w-xs rounded border mb-4"
                      />
                    )}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {upiDetails.upi_id && (
                        <div className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="text-xs text-muted-foreground">UPI ID</p>
                            <p className="font-mono text-sm">{upiDetails.upi_id}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyText(upiDetails.upi_id, "UPI ID")}
                          >
                            <Copy className="h-4 w-4 mr-1" /> Copy
                          </Button>
                        </div>
                      )}
                      {upiDetails.upi_number && (
                        <div className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="text-xs text-muted-foreground">UPI Number</p>
                            <p className="font-mono text-sm">{upiDetails.upi_number}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyText(upiDetails.upi_number, "UPI Number")}
                          >
                            <Copy className="h-4 w-4 mr-1" /> Copy
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!upiDetails && (
                  <div className="text-center p-6 border rounded">
                    <p className="text-muted-foreground">UPI details are not configured. Please contact support or choose Cash on Delivery.</p>
                  </div>
                )}

                <div className="space-y-4">
                  <Label>Upload Payment Screenshot</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                      className="hidden"
                      id="payment-proof"
                    />
                    <Label htmlFor="payment-proof" className="cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="font-semibold">
                        {paymentProof ? paymentProof.name : "Click to upload"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        PNG, JPG up to 10MB
                      </p>
                    </Label>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handlePaymentProofUpload}
                    disabled={!paymentProof || loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit for Verification
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Checkout;
