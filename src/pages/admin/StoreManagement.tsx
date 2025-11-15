import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminRoute from "@/components/auth/AdminRoute";
import AdminNav from "@/components/admin/AdminNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Store {
  id: string;
  name: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  district?: string | null;
  postal_code: string;
  country: string;
  phone: string;
  email: string | null;
  whatsapp?: string | null;
  google_maps_url?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  google_business_url?: string | null;
  opening_hours: any;
  is_active: boolean;
}

const defaultOpeningHours = {
  monday: "10:00 AM - 8:00 PM",
  tuesday: "10:00 AM - 8:00 PM",
  wednesday: "10:00 AM - 8:00 PM",
  thursday: "10:00 AM - 8:00 PM",
  friday: "10:00 AM - 8:00 PM",
  saturday: "10:00 AM - 9:00 PM",
  sunday: "11:00 AM - 7:00 PM",
};

const StoreManagement = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    district: "",
    postal_code: "",
    country: "India",
    phone: "",
    email: "",
    whatsapp: "",
    google_maps_url: "",
    facebook: "",
    instagram: "",
    google_business_url: "",
    is_active: true,
    opening_hours: defaultOpeningHours,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("name");

      if (error) throw error;
      setStores((data || []) as Store[]);
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast({
        title: "Error",
        description: "Failed to fetch stores",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address_line_1: store.address_line_1,
      address_line_2: store.address_line_2 || "",
      city: store.city,
      state: store.state,
      district: store.district || "",
      postal_code: store.postal_code,
      country: store.country,
      phone: store.phone,
      email: store.email || "",
      whatsapp: store.whatsapp || "",
      google_maps_url: store.google_maps_url || "",
      facebook: store.facebook || "",
      instagram: store.instagram || "",
      google_business_url: store.google_business_url || "",
      is_active: store.is_active,
      opening_hours: store.opening_hours,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingStore(null);
    setFormData({
      name: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      district: "",
      postal_code: "",
      country: "India",
      phone: "",
      email: "",
      whatsapp: "",
      google_maps_url: "",
      facebook: "",
      instagram: "",
      google_business_url: "",
      is_active: true,
      opening_hours: defaultOpeningHours,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.address_line_1 || !formData.city || !formData.phone) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const storeData = {
        name: formData.name,
        address_line_1: formData.address_line_1,
        address_line_2: formData.address_line_2 || null,
        city: formData.city,
        state: formData.state,
        district: formData.district || null,
        postal_code: formData.postal_code,
        country: formData.country,
        phone: formData.phone,
        email: formData.email || null,
        whatsapp: formData.whatsapp || null,
        google_maps_url: formData.google_maps_url || null,
        facebook: formData.facebook || null,
        instagram: formData.instagram || null,
        google_business_url: formData.google_business_url || null,
        is_active: formData.is_active,
        opening_hours: formData.opening_hours,
      };

      if (editingStore) {
        const { error } = await supabase
          .from("stores")
          .update(storeData)
          .eq("id", editingStore.id);

        if (error) throw error;
        toast({ title: "Success", description: "Store updated successfully" });
      } else {
        const { error } = await supabase
          .from("stores")
          .insert([storeData]);

        if (error) throw error;
        toast({ title: "Success", description: "Store created successfully" });
      }

      setDialogOpen(false);
      fetchStores();
    } catch (error: any) {
      console.error("Error saving store:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save store",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("stores")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({ title: "Success", description: "Store deleted successfully" });
      fetchStores();
    } catch (error) {
      console.error("Error deleting store:", error);
      toast({
        title: "Error",
        description: "Failed to delete store",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <AdminRoute>
      <div className="min-h-screen flex flex-col">
        <Header />
        <AdminNav />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Store Management</h1>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Store
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Showroom Locations ({stores.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No stores found. Add your first showroom!
                      </TableCell>
                    </TableRow>
                  ) : (
                    stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell>
                          {store.address_line_1}, {store.city}, {store.state}
                        </TableCell>
                        <TableCell>{store.phone}</TableCell>
                        <TableCell>
                          <Badge variant={store.is_active ? "default" : "secondary"}>
                            {store.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(store)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteId(store.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
        <Footer />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStore ? "Edit Store" : "Add New Store"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Store Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Downtown Showroom"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="address_line_1">Address Line 1 *</Label>
                  <Input
                    id="address_line_1"
                    value={formData.address_line_1}
                    onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="address_line_2">Address Line 2</Label>
                  <Input
                    id="address_line_2"
                    value={formData.address_line_2}
                    onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                    placeholder="Suite 100"
                  />
                </div>

                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Mumbai"
                  />
                </div>

                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Maharashtra"
                  />
                </div>

                <div>
                  <Label htmlFor="postal_code">Postal Code *</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="400001"
                  />
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="store@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="District name"
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="google_maps_url">Google Maps URL</Label>
                  <Input
                    id="google_maps_url"
                    value={formData.google_maps_url}
                    onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                    placeholder="https://goo.gl/maps/..."
                  />
                </div>

                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="https://facebook.com/..."
                  />
                </div>

                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="https://instagram.com/..."
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="google_business_url">Google Business URL</Label>
                  <Input
                    id="google_business_url"
                    value={formData.google_business_url}
                    onChange={(e) => setFormData({ ...formData, google_business_url: e.target.value })}
                    placeholder="https://g.page/..."
                  />
                </div>

                <div className="col-span-2">
                  <Label className="mb-2 block">Operating Hours</Label>
                  <div className="space-y-2">
                    {Object.entries(formData.opening_hours).map(([day, hours]) => (
                      <div key={day} className="flex gap-2 items-center">
                        <Label className="w-24 capitalize">{day}</Label>
                        <Input
                          value={hours}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              opening_hours: {
                                ...formData.opening_hours,
                                [day]: e.target.value,
                              },
                            })
                          }
                          placeholder="10:00 AM - 8:00 PM"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                {editingStore ? "Update Store" : "Create Store"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Store</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this store? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminRoute>
  );
};

export default StoreManagement;
