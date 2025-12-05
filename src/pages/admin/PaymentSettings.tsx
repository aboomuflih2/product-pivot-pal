import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminRoute from "@/components/auth/AdminRoute";
import AdminNav from "@/components/admin/AdminNav";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  upi_id: z.string().min(3, "UPI ID is required"),
  upi_number: z.string().min(10, "UPI mobile number must be at least 10 digits").optional().or(z.literal("")),
  upi_qr_code_url: z.string().url().optional().or(z.literal("").transform(() => undefined)),
});

type PaymentForm = z.infer<typeof schema>;

const PaymentSettings = () => {
  const form = useForm<PaymentForm>({
    resolver: zodResolver(schema),
    defaultValues: { upi_id: "", upi_number: "", upi_qr_code_url: undefined },
  });
  const [loading, setLoading] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const settings = data as any;
        form.reset({
          upi_id: settings.upi_id || "",
          upi_number: settings.upi_number || "",
          upi_qr_code_url: settings.upi_qr_code_url || undefined,
        });
      }
    } catch (err) {
      console.error("Failed to load payment settings", err);
    }
  };

  const uploadQrIfNeeded = async (): Promise<string | undefined> => {
    if (!qrFile) return form.getValues("upi_qr_code_url");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const ext = qrFile.name.split(".").pop();
    const fileName = `payment/qr_${user.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-settings")
      .upload(fileName, qrFile, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage
      .from("payment-settings")
      .getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  const onSubmit = async (values: PaymentForm) => {
    setLoading(true);
    try {
      const upi_qr_code_url = await uploadQrIfNeeded();
      const payload = { 
        upi_id: values.upi_id, 
        upi_number: values.upi_number || null,
        upi_qr_code_url: upi_qr_code_url || null 
      };

      const { data: existing } = await supabase
        .from("payment_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from("payment_settings")
          .update(payload as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("payment_settings")
          .insert(payload as any);
        if (error) throw error;
      }

      toast({ title: "Saved", description: "Payment settings updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminRoute>
      <div className="min-h-screen flex flex-col">
        <Header />
        <AdminNav />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings (UPI)</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="upi_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UPI ID</FormLabel>
                        <FormControl>
                          <Input placeholder="example@bank" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="upi_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UPI Mobile Number</FormLabel>
                        <FormControl>
                          <Input placeholder="9876543210" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>UPI QR Code</FormLabel>
                    <Input type="file" accept="image/*" onChange={(e) => setQrFile(e.target.files?.[0] || null)} />
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Settings
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </AdminRoute>
  );
};

export default PaymentSettings;
