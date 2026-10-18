import { createContext } from "react";
import type { CompanionId } from "../packages/domain/companions";
export const CompanionContext = createContext<CompanionId>("fox");
