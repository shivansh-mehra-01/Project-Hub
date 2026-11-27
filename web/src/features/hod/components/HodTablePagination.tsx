import React from "react";
import {
  TablePagination,
  TablePaginationProps,
} from "@/design-system/patterns/TablePagination";

export type HodTablePaginationProps = TablePaginationProps;

export const HodTablePagination: React.FC<HodTablePaginationProps> = (props) => (
  <TablePagination {...props} />
);
