import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CategorySection from "@/components/home/CategorySection";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>911 Clothings - Premium Kids Imported Clothing & Toys</title>
        <meta name="description" content="Shop the finest imported kids clothing, toys, and accessories at 911 Clothings. Quality products for newborns, toddlers, and children. Free shipping on orders over ₹999." />
        <link rel="canonical" href="https://911clothings.com/" />
        <meta property="og:title" content="911 Clothings - Premium Kids Imported Clothing & Toys" />
        <meta property="og:description" content="Shop the finest imported kids clothing, toys, and accessories. Quality products for newborns, toddlers, and children." />
        <meta property="og:url" content="https://911clothings.com/" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturedProducts />
        <CategorySection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
