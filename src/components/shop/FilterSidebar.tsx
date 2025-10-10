import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

interface FilterSidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

const categories = [
  { id: "newborn", label: "Newborn (0-6M)" },
  { id: "infant", label: "Infant (6-12M)" },
  { id: "toddler", label: "Toddler (1-3Y)" },
  { id: "kids", label: "Kids (3-8Y)" },
  { id: "boys", label: "Boys" },
  { id: "girls", label: "Girls" },
  { id: "toys", label: "Toys" },
  { id: "accessories", label: "Accessories" },
];

const sizes = [
  { id: "0-3m", label: "0-3 Months" },
  { id: "3-6m", label: "3-6 Months" },
  { id: "6-12m", label: "6-12 Months" },
  { id: "xs", label: "XS" },
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
  { id: "xl", label: "XL" },
];

const colors = [
  { id: "red", label: "Red", hex: "#EF4444" },
  { id: "blue", label: "Blue", hex: "#3B82F6" },
  { id: "pink", label: "Pink", hex: "#EC4899" },
  { id: "yellow", label: "Yellow", hex: "#F59E0B" },
  { id: "green", label: "Green", hex: "#10B981" },
  { id: "purple", label: "Purple", hex: "#8B5CF6" },
  { id: "black", label: "Black", hex: "#1F2937" },
  { id: "white", label: "White", hex: "#F9FAFB" },
];

const FilterSidebar = ({ onClose, isMobile }: FilterSidebarProps) => {
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSizeToggle = (sizeId: string) => {
    setSelectedSizes((prev) =>
      prev.includes(sizeId)
        ? prev.filter((id) => id !== sizeId)
        : [...prev, sizeId]
    );
  };

  const handleColorToggle = (colorId: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorId)
        ? prev.filter((id) => id !== colorId)
        : [...prev, colorId]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setPriceRange([0, 5000]);
  };

  return (
    <div className="h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-bold text-lg">Filters</h2>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-180px)]">
        {/* Clear All */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={clearAllFilters}
        >
          Clear All Filters
        </Button>

        <Separator />

        {/* Category Filter */}
        <div>
          <h3 className="font-semibold mb-3">Category</h3>
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => handleCategoryToggle(category.id)}
                />
                <Label
                  htmlFor={category.id}
                  className="text-sm cursor-pointer flex-1"
                >
                  {category.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Price Range */}
        <div>
          <h3 className="font-semibold mb-3">Price Range</h3>
          <div className="px-2">
            <Slider
              min={0}
              max={10000}
              step={100}
              value={priceRange}
              onValueChange={setPriceRange}
              className="mb-4"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>₹{priceRange[0]}</span>
              <span>₹{priceRange[1]}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Size Filter */}
        <div>
          <h3 className="font-semibold mb-3">Size</h3>
          <div className="grid grid-cols-2 gap-2">
            {sizes.map((size) => (
              <Button
                key={size.id}
                variant={selectedSizes.includes(size.id) ? "default" : "outline"}
                size="sm"
                onClick={() => handleSizeToggle(size.id)}
                className="justify-center"
              >
                {size.label}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Color Filter */}
        <div>
          <h3 className="font-semibold mb-3">Color</h3>
          <div className="grid grid-cols-4 gap-3">
            {colors.map((color) => (
              <button
                key={color.id}
                onClick={() => handleColorToggle(color.id)}
                className={`w-12 h-12 rounded-full border-2 transition-all ${
                  selectedColors.includes(color.id)
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-border hover:border-muted-foreground"
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.label}
                aria-label={color.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Apply Button (Mobile) */}
      {isMobile && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background">
          <Button className="w-full" onClick={onClose}>
            Apply Filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default FilterSidebar;
