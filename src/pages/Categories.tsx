import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  description: string | null;
  slug: string;
}

const Categories = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (slug: string) => {
    navigate(`/shop?category=${slug}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Kids Clothing Categories | 911 Clothings</title>
        <meta name="description" content="Browse our collection of premium kids clothing and toys by category. Find the perfect outfits for newborns, toddlers, and children." />
        <link rel="canonical" href="https://911clothings.com/categories" />
        <meta property="og:title" content="Kids Clothing Categories | 911 Clothings" />
        <meta property="og:description" content="Browse our collection of premium kids clothing and toys by category." />
        <meta property="og:url" content="https://911clothings.com/categories" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Header />
      <main className="flex-1">
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Shop by Category</h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Browse our collection of premium kids clothing and toys by category
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-40 w-full mb-4 rounded-lg" />
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No categories available at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categories.map((category) => (
                  <Card
                    key={category.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden group"
                    onClick={() => handleCategoryClick(category.slug)}
                  >
                    <CardContent className="p-0">
                      <div className="h-48 bg-gradient-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center group-hover:from-primary/20 group-hover:via-primary/10 transition-all duration-300">
                        <div className="text-center p-6">
                          <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                            {category.name}
                          </h3>
                          {category.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="p-4 bg-card">
                        <p className="text-sm font-medium text-primary group-hover:underline">
                          Browse Products →
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Categories;
