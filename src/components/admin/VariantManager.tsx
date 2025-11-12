import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import imageCompression from 'browser-image-compression';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Upload, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Variant {
  id?: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  image_url?: string | null;
}

interface VariantManagerProps {
  productId: string;
}

const VariantManager = ({ productId }: VariantManagerProps) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchVariants();
  }, [productId]);

  const fetchVariants = async () => {
    try {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("created_at");

      if (error) throw error;

      if (data && data.length > 0) {
        setVariants(data);
        const uniqueSizes = [...new Set(data.map(v => v.size).filter(Boolean))] as string[];
        const uniqueColors = [...new Set(data.map(v => v.color).filter(Boolean))] as string[];
        setSizes(uniqueSizes);
        setColors(uniqueColors);
      }
    } catch (error) {
      console.error("Error fetching variants:", error);
      toast({
        title: "Error",
        description: "Failed to load variants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addSize = () => {
    if (newSize && !sizes.includes(newSize)) {
      setSizes([...sizes, newSize]);
      setNewSize("");
    }
  };

  const addColor = () => {
    if (newColor && !colors.includes(newColor)) {
      setColors([...colors, newColor]);
      setNewColor("");
    }
  };

  const removeSize = (size: string) => {
    setSizes(sizes.filter(s => s !== size));
    setVariants(variants.filter(v => v.size !== size));
  };

  const removeColor = (color: string) => {
    setColors(colors.filter(c => c !== color));
    setVariants(variants.filter(v => v.color !== color));
  };

  const generateVariants = () => {
    const newVariants: Variant[] = [];

    if (sizes.length === 0 && colors.length === 0) {
      toast({
        title: "Info",
        description: "Please add at least one size or color",
        variant: "default",
      });
      return;
    }

    if (sizes.length > 0 && colors.length > 0) {
      // Generate combinations
      for (const size of sizes) {
        for (const color of colors) {
          const existing = variants.find(v => v.size === size && v.color === color);
          if (!existing) {
            newVariants.push({
              sku: `${productId.substring(0, 4)}-${size}-${color}`.toUpperCase(),
              size,
              color,
              price: 0,
              stock_quantity: 0,
              is_active: true,
            });
          }
        }
      }
    } else if (sizes.length > 0) {
      // Only sizes
      for (const size of sizes) {
        const existing = variants.find(v => v.size === size && !v.color);
        if (!existing) {
          newVariants.push({
            sku: `${productId.substring(0, 4)}-${size}`.toUpperCase(),
            size,
            color: "",
            price: 0,
            stock_quantity: 0,
            is_active: true,
          });
        }
      }
    } else {
      // Only colors
      for (const color of colors) {
        const existing = variants.find(v => v.color === color && !v.size);
        if (!existing) {
          newVariants.push({
            sku: `${productId.substring(0, 4)}-${color}`.toUpperCase(),
            size: "",
            color,
            price: 0,
            stock_quantity: 0,
            is_active: true,
          });
        }
      }
    }

    setVariants([...variants, ...newVariants]);

    if (newVariants.length > 0) {
      toast({
        title: "Success",
        description: `Generated ${newVariants.length} new variant(s)`,
      });
    }
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleVariantImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(index);

    try {
      // Compress image for WhatsApp compatibility
      const options = {
        maxSizeMB: 0.3, // 300KB limit for WhatsApp
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/jpeg',
      };

      const compressedFile = await imageCompression(file, options);

      const fileExt = 'jpg'; // Always use jpg for compressed images
      const fileName = `${productId}/variants/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      updateVariant(index, 'image_url', publicUrl);

      toast({
        title: "Success",
        description: "Variant image compressed and uploaded",
      });
    } catch (error) {
      console.error("Error uploading variant image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteVariantImage = async (index: number) => {
    const variant = variants[index];
    if (!variant.image_url) return;

    try {
      const fileName = variant.image_url.split('/').slice(-3).join('/');
      await supabase.storage
        .from('product-images')
        .remove([fileName]);

      updateVariant(index, 'image_url', null);

      toast({
        title: "Success",
        description: "Variant image deleted",
      });
    } catch (error) {
      console.error("Error deleting variant image:", error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const saveVariants = async () => {
    try {
      for (const variant of variants) {
        if (variant.id) {
          // Update existing
          const { error } = await supabase
            .from("product_variants")
            .update({
              sku: variant.sku,
              size: variant.size || null,
              color: variant.color || null,
              price: variant.price,
              stock_quantity: variant.stock_quantity,
              is_active: variant.is_active,
              image_url: variant.image_url || null,
            })
            .eq("id", variant.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from("product_variants")
            .insert({
              product_id: productId,
              sku: variant.sku,
              size: variant.size || null,
              color: variant.color || null,
              price: variant.price,
              stock_quantity: variant.stock_quantity,
              is_active: variant.is_active,
              image_url: variant.image_url || null,
            });

          if (error) throw error;
        }
      }

      toast({
        title: "Success",
        description: "Variants saved successfully",
      });

      fetchVariants();
    } catch (error: any) {
      console.error("Error saving variants:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save variants",
        variant: "destructive",
      });
    }
  };

  const deleteVariant = async (index: number) => {
    const variant = variants[index];

    if (variant.id) {
      try {
        const { error } = await supabase
          .from("product_variants")
          .delete()
          .eq("id", variant.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Variant deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting variant:", error);
        toast({
          title: "Error",
          description: "Failed to delete variant",
          variant: "destructive",
        });
        return;
      }
    }

    setVariants(variants.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="text-center py-8">Loading variants...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Variant Attributes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sizes</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  placeholder="e.g., S, M, L"
                  onKeyPress={(e) => e.key === 'Enter' && addSize()}
                />
                <Button onClick={addSize} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {sizes.map((size) => (
                  <Badge key={size} variant="secondary">
                    {size}
                    <button
                      onClick={() => removeSize(size)}
                      className="ml-2 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Colors</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  placeholder="e.g., Red, Blue"
                  onKeyPress={(e) => e.key === 'Enter' && addColor()}
                />
                <Button onClick={addColor} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {colors.map((color) => (
                  <Badge key={color} variant="secondary">
                    {color}
                    <button
                      onClick={() => removeColor(color)}
                      className="ml-2 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={generateVariants}>Generate Variants</Button>
        </CardContent>
      </Card>

      {variants.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Variants ({variants.length})</CardTitle>
            <Button onClick={saveVariants}>
              <Save className="h-4 w-4 mr-2" />
              Save All
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Price (₹)</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={variant.sku}
                        onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>{variant.size || "-"}</TableCell>
                    <TableCell>{variant.color || "-"}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={variant.stock_quantity}
                        onChange={(e) => updateVariant(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {variant.image_url ? (
                          <div className="relative group">
                            <img src={variant.image_url} alt="Variant" className="w-12 h-12 object-cover rounded" />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteVariantImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleVariantImageUpload(index, e)}
                              disabled={uploading === index}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              disabled={uploading === index}
                            >
                              <span>
                                <Upload className="h-4 w-4" />
                              </span>
                            </Button>
                          </label>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={variant.is_active}
                        onCheckedChange={(checked) => updateVariant(index, 'is_active', checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteVariant(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VariantManager;
