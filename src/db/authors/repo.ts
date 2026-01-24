import { assertDateString, binaryToUuid, uuidToBinary } from "../utils";
import type { Author, NewAuthor } from "./types.ts";
import type { UUID, RemoteId } from "../types.ts";
import * as mutations from "./sql/mutations.ts";
import * as lookups from "./sql/lookups.ts";
import * as books from "./sql/books.ts";
import type { mysql } from "../bindings/mysql.ts";

