import React from "react";
import {
  ConfirmationDialog,
  ConfirmationDialogProps,
} from "@/design-system/patterns/PageStates";

export type HodConfirmationDialogProps = ConfirmationDialogProps;

export const HodConfirmationDialog: React.FC<HodConfirmationDialogProps> = (props) => (
  <ConfirmationDialog {...props} />
);
