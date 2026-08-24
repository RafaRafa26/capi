import {
  ArrowLeftRight,
  GalleryVerticalEnd,
  LayoutDashboard,
  Landmark,
  Settings,
  Store,
  UserCircle,
  Users,
} from "lucide-react";

import type { NavMainItem } from "@/components/nav-main";
import type { NavProjectItem } from "@/components/nav-projects";
import type { Team } from "@/components/team-switcher";

export const teams: Team[] = [
  { name: "Capi HUB", document: "12.345.678/0001-90", logo: GalleryVerticalEnd },
];

export const currentUser = {
  name: "Rafael Arantes",
  email: "rafael@email.com",
  avatarUrl: "",
};

export const navMainGroups: { label?: string; items: NavMainItem[] }[] = [
  {
    items: [{ title: "Visão geral", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Financeiro",
    items: [
      {
        title: "Contas e Extratos",
        url: "/contas-bancarias",
        icon: Landmark,
        items: [
          { title: "Contas bancárias", url: "/contas-bancarias" },
          { title: "Categorias", url: "/categorias" },
          { title: "Centros de custo", url: "/centros-de-custo" },
        ],
      },
      {
        title: "Conciliação",
        url: "/conciliacao",
        icon: ArrowLeftRight,
        items: [
          { title: "Conciliação bancária", url: "/conciliacao" },
          { title: "Contas a receber", url: "/contas-a-receber" },
          { title: "Repasses", url: "/repasses" },
        ],
      },
    ],
  },
];

export const contatosNav: { label?: string; items: NavProjectItem[] } = {
  label: "Contatos",
  items: [
    { name: "Favorecidos", url: "/contatos?papel=favorecido", icon: Users },
    { name: "Fornecedores", url: "/contatos?papel=fornecedor", icon: Store },
    { name: "Clientes", url: "/contatos?papel=pagador", icon: UserCircle },
  ],
};

export const configuracoesGroup: { label?: string; items: NavMainItem[] } = {
  items: [{ title: "Configurações", url: "/configuracoes", icon: Settings }],
};
