"use client";

import {
  ForkKnife,
  Coffee,
  Car,
  ShoppingBag,
  FilmSlate,
  GraduationCap,
  Heartbeat,
  ArrowCircleUp,
  DotsThreeCircle,
  type Icon,
} from "@phosphor-icons/react";
import type { Category } from "@/db/schema";

const icons: Record<Category, Icon> = {
  makanan: ForkKnife,
  minuman: Coffee,
  transportasi: Car,
  belanja: ShoppingBag,
  hiburan: FilmSlate,
  pendidikan: GraduationCap,
  kesehatan: Heartbeat,
  pemasukan: ArrowCircleUp,
  lainnya: DotsThreeCircle,
};

export function CategoryIcon({
  category,
  size = 18,
}: {
  category: Category;
  size?: number;
}) {
  const IconComponent = icons[category] ?? DotsThreeCircle;
  return <IconComponent size={size} />;
}
