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

export type NavLeaf = {
  title: string;
  url: string;
};

export type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  items?: NavLeaf[];
};

export type NavSection = {
  label?: string;
  items: NavItem[];
};

export const orgInfo = {
  name: "Capi HUB",
  document: "12.345.678/0001-90",
  icon: GalleryVerticalEnd,
};

export const currentUser = {
  name: "Rafael Arantes",
  email: "rafael@email.com",
  avatarUrl: "",
};

export const navSections: NavSection[] = [
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
  {
    label: "Contatos",
    items: [
      { title: "Favorecidos", url: "/contatos?papel=favorecido", icon: Users },
      { title: "Fornecedores", url: "/contatos?papel=fornecedor", icon: Store },
      { title: "Clientes", url: "/contatos?papel=pagador", icon: UserCircle },
    ],
  },
  {
    items: [{ title: "Configurações", url: "/configuracoes", icon: Settings }],
  },
];
