# SDKs

Convenience wrappers for the Slices shell scripts. Not required—you can always work with `.slice` files directly or use the CLI.

---

## TypeScript

```bash
npm install @treetext/sdk
```

```typescript
import { Memory } from "@treetext/sdk";

const mem = new Memory(".slices");
const id = await mem.create({ title: "API Notes", summary: "API design decisions" });
await mem.remember(id, "The API uses GraphQL");
const results = await mem.search("authentication");
await mem.connect(id, otherId, "depends_on");
const graph = await mem.explore(id);
```

## Python

```bash
pip install treetext
```

```python
from treetext import Memory

mem = Memory(".slices")
file = mem.create("API Notes", "API design decisions")
mem.remember(file.id, content="The API uses GraphQL")
results = mem.search("authentication")
mem.connect("01JAUTH", "01JSECURITY", "evidence_for")
neighbors = mem.explore("01JAUTH")
```

## All Operations

| Operation    | Description                         |
| ------------ | ----------------------------------- |
| `create`     | Create new file with ID             |
| `define`     | Update file metadata and contract   |
| `remember`   | Add or update content in file by ID |
| `search`     | Search for knowledge                |
| `explore`    | Navigate relationships              |
| `connect`    | Create relationships                |
| `disconnect` | Remove relationships                |
| `forget`     | Archive or permanently delete       |
| `info`       | Get metadata about memory or a file |

Both SDKs wrap the same underlying shell scripts. See [Tools](/reference) for the full reference.
