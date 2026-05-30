# Architecture — cross-cutting decisions

> 📐 **Read this before you wire up any feature.** These four docs cover the
> *shared* concerns that every feature touches but no feature owns. If a
> screen, store slice, API call, or permission check disagrees with what's in
> here, update the doc in the same change.

Per-feature specs live in [../implementation_doc/](../implementation_doc/) — they cover
data models, endpoints, flows, and acceptance criteria *within* one module. The four
docs in this folder cover what's *between* them.

| Doc | What it locks down |
|---|---|
| [routes.md](./routes.md) | Every URL → screen mockup → impl doc → auth gate. The single answer to "what URL is this screen?" |
| [state.md](./state.md) | Redux slice ownership for V1 and the **active-client** model — what lives in store vs URL vs server vs localStorage |
| [api-conventions.md](./api-conventions.md) | Shared HTTP contract: base URL, headers, error shape, pagination, idempotency. Feature endpoints follow this contract by default. |
| [auth-tenancy.md](./auth-tenancy.md) | The multi-tenant hierarchy (agency → clients → resources), the role + scope matrix, and where scoping is enforced. |

---

## Where these decisions came from

- **MVP scope** — [../MVP.md](../MVP.md)
- **Feature catalog** — [../feature/feature_list.md](../feature/feature_list.md), [../feature/feature_details.md](../feature/feature_details.md)
- **Per-feature specs** — [../implementation_doc/](../implementation_doc/)
- **Repo layout** — [../folder_structure/folder_structure.md](../folder_structure/folder_structure.md)
- **Visual contract** — [../theme/theme.md](../theme/theme.md) + [../mockups/](../mockups/)
