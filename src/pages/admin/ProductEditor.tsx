import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import imageCompression from 'browser-image-compression';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminRoute from "@/components/auth/AdminRoute";
import AdminNav from "@/components/admin/AdminNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VariantManager from "@/components/admin/VariantManager";

interface Category {
  id: string;
  name: string;
}

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

const ProductEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const { toast } = useToast();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    is_active: true,
  });

  useEffect(() => {
    fetchCategories();
    if (!isNew && id) {
      fetchProduct();
      fetchImages();
    }
  }, [id, isNew]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          title: data.title,
          description: data.description || "",
          category_id: data.category_id || "",
          is_active: data.is_active,
        });
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast({
        title: "Error",
        description: "Failed to load product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", id)
        .order("display_order");

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (isNew) {
      toast({
        title: "Info",
        description: "Please save the product first before uploading images",
        variant: "default",
      });
      return;
    }

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        // Compress image for WhatsApp compatibility
        const options = {
          maxSizeMB: 0.3, // 300KB limit for WhatsApp
          maxWidthOrHeight: 1200,
          useWebWorker: true,
          fileType: 'image/jpeg',
        };

        const compressedFile = await imageCompression(file, options);
        
        // Validate file size
        if (compressedFile.size > 300 * 1024) {
          toast({
            title: "Warning",
            description: `Image ${file.name} is still too large after compression. Using compressed version anyway.`,
            variant: "default",
          });
        }

        const fileExt = 'jpg'; // Always use jpg for compressed images
        const fileName = `${id}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from('product_images')
          .insert({
            product_id: id,
            image_url: publicUrl,
            is_primary: images.length === 0,
            display_order: images.length,
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Success",
        description: "Images compressed and uploaded successfully",
      });

      fetchImages();
    } catch (error) {
      console.error("Error uploading images:", error);
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    try {
      const fileName = imageUrl.split('/').slice(-2).join('/');
      
      await supabase.storage
        .from('product-images')
        .remove([fileName]);

      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Image deleted successfully",
      });

      fetchImages();
    } catch (error) {
      console.error("Error deleting image:", error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast({
        title: "Validation Error",
        description: "Product title is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Convert empty string to null for category_id
      const productData = {
        ...formData,
        category_id: formData.category_id || null,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("products")
          .insert([productData])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Success",
          description: "Product created successfully",
        });

        navigate(`/admin/products/${data.id}`);
      } else {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Product updated successfully",
        });
      }
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminRoute>
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen flex flex-col">
        <Header />
        <AdminNav />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/products")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
            <h1 className="text-3xl font-bold">
              {isNew ? "Create New Product" : "Edit Product"}
            </h1>
          </div>

          <Tabs defaultValue="details" className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="images" disabled={isNew}>Images</TabsTrigger>
              <TabsTrigger value="variants" disabled={isNew}>Variants & Inventory</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Product Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Product title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Product description"
                      rows={6}
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>

                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : isNew ? "Create Product" : "Update Product"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="images">
              <Card>
                <CardHeader>
                  <CardTitle>Product Images</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="image-upload">Upload Multiple Images</Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-2">
                      Select multiple images at once to upload
                    </p>
                    <div className="mt-2">
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </div>
                    {uploading && (
                      <p className="text-sm text-muted-foreground mt-2">Uploading images...</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((image) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.image_url}
                          alt="Product"
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteImage(image.id, image.image_url)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        {image.is_primary && (
                          <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                            Primary
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variants">
              {id && <VariantManager productId={id} />}
            </TabsContent>
          </Tabs>
        </main>
        <Footer />
      </div>
    </AdminRoute>
  );
};

export default ProductEditor;
