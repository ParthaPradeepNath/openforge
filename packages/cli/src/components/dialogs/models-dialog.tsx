import { useCallback } from "react";

import { Mode } from "@openforge/database/enums";
import type { SupportedChatModelId } from "@openforge/shared";

import { useDialog } from "../../providers/dialog";
import { DialogSearchList } from "../dialog-search-list";

type ModelsDialogContentProps = {
  models: SupportedChatModelId[];
  onSelectModel: (modeId: SupportedChatModelId) => void;
};

export const ModelsDialogContent = ({
  models,
  onSelectModel,
}: ModelsDialogContentProps) => {
  const dialog = useDialog();

  const handleSelect = useCallback(
    (modelId: SupportedChatModelId) => {
      onSelectModel(modelId);
      dialog.close();
    },
    [onSelectModel, dialog]
  );
  return (
    <DialogSearchList
      items={models}
      onSelect={handleSelect}
      filterFn={(modelId, query) =>
        modelId.toLowerCase().includes(query.toLowerCase())
      }
      renderItem={(modelId, isSelected) => (
        <text selectable={false} fg={isSelected ? "black" : "white"}>
          {modelId}
        </text>
      )}
      getKey={(item) => item}
      placeholder="Search models"
      emptyText="No matching models"
    />
  );
};
