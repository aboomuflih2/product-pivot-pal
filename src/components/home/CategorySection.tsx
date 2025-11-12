import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const CategorySection = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .limit(6);

      if (error) throw error;
      return (data || []).map(cat => ({
        ...cat,
        thumbnail_url: (cat as any).thumbnail_url || null
      }));
    },
  });

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Shop by Category</h2>
          <p className="text-muted-foreground">Discover our wide range of products</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-12 bg-muted/30">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-2">Shop by Category</h2>
        <p className="text-muted-foreground">Discover our wide range of products</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {categories?.map((category) => (
          <Link
            key={category.id}
            to={`/shop?category=${category.slug}`}
            className="group relative aspect-[4/3] rounded-lg overflow-hidden"
          >
            {category.thumbnail_url ? (
              <img 
                src={category.thumbnail_url} 
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <h3 className="text-2xl font-semibold text-white group-hover:scale-110 transition-transform">
                {category.name}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategorySection;
