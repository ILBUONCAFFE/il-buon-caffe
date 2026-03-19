import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ENCYCLOPEDIA_CATEGORIES } from "@/lib/constants";

type CategoryId = (typeof ENCYCLOPEDIA_CATEGORIES)[number]["id"];

const getCategory = (id: string) => {
  // Handle 'wino' as alias for 'wine'
  const categoryId = id === 'wino' ? 'wine' : id;
  return ENCYCLOPEDIA_CATEGORIES.find((cat) => cat.id === (categoryId as CategoryId));
};

const CategoryPage = async ({ params }: { params: Promise<{ category: string }> }) => {
  const { category: categorySlug } = await params;
  const category = getCategory(categorySlug);

  if (!category) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-brand-50">
      <section className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden">
        <Image
          src={category.heroImage}
          alt={category.title}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/80" />
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-6 lg:px-12 pb-12 md:pb-16">
            <div className="max-w-3xl text-white">
              <div className="text-xs uppercase tracking-[0.2em] text-white/60 mb-4">
                Encyklopedia • {category.label}
              </div>
              <h1 className="text-4xl md:text-6xl font-serif mb-4">
                {category.title}
              </h1>
              <p className="text-white/70 text-lg md:text-xl leading-relaxed">
                {category.subtitle}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 lg:px-12 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-700 mb-4">
              Najważniejsze
            </h2>
            <ul className="space-y-4 text-brand-700 text-lg">
              {category.points.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-brand-700 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-3xl border border-brand-100 p-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-700 mb-4">
              Wskazówki
            </h2>
            <ul className="space-y-4 text-brand-700 text-lg">
              {category.highlights.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-brand-400 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-10">
          <Link
            href="/encyklopedia"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-900 text-white rounded-full font-semibold text-sm hover:bg-brand-700 transition-colors"
          >
            Wróć do encyklopedii
          </Link>
          <Link
            href="/sklep"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-brand-200 text-brand-800 rounded-full font-semibold text-sm hover:bg-brand-50 transition-colors"
          >
            Zobacz produkty
          </Link>
        </div>
      </section>
    </div>
  );
};

export default CategoryPage;
