export const STATUSES = [
  "new",
  "under_review",
  "planned",
  "in_progress",
  "done",
  "dismissed",
] as const;

export type Status = (typeof STATUSES)[number];

export const PLANS = ["free", "paid"] as const;
export type Plan = (typeof PLANS)[number];

export const ROLES = ["owner", "admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export const LOCALES = ["en", "pt-br"] as const;
export type Locale = (typeof LOCALES)[number];

export const STATUS_LABELS: Record<Locale, Record<Status, string>> = {
  en: {
    new: "New",
    under_review: "Under Review",
    planned: "Planned",
    in_progress: "In Progress",
    done: "Done",
    dismissed: "Dismissed",
  },
  "pt-br": {
    new: "Novo",
    under_review: "Em Análise",
    planned: "Planejado",
    in_progress: "Em Progresso",
    done: "Concluído",
    dismissed: "Descartado",
  },
};

export const UI_STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    submit: "Submit",
    newSuggestion: "New suggestion",
    vote: "Vote",
    comments: "Comments",
    search: "Search...",
    allStatuses: "All",
    poweredBy: "Powered by Marapulse",
    sendCode: "Send code",
    verifyCode: "Verify",
    enterEmail: "Enter your email",
    enterCode: "Enter 6-digit code",
    noSuggestions: "No suggestions yet. Be the first!",
    addComment: "Add a comment...",
    team: "Team",
    delete: "Delete",
    settings: "Settings",
    signOut: "Sign out",
    admin: "Admin",
  },
  "pt-br": {
    submit: "Enviar",
    newSuggestion: "Nova sugestão",
    vote: "Votar",
    comments: "Comentários",
    search: "Buscar...",
    allStatuses: "Todos",
    poweredBy: "Powered by Marapulse",
    sendCode: "Enviar código",
    verifyCode: "Verificar",
    enterEmail: "Digite seu email",
    enterCode: "Digite o código de 6 dígitos",
    noSuggestions: "Nenhuma sugestão ainda. Seja o primeiro!",
    addComment: "Adicionar um comentário...",
    team: "Equipe",
    delete: "Excluir",
    settings: "Configurações",
    signOut: "Sair",
    admin: "Admin",
  },
};
