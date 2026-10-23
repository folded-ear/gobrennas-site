import {
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  Label,
} from "@heroui/react";
import { useId } from "react";
import { Controller, type Control } from "react-hook-form";
import type { PlanDetailsValues } from "./settings-form";

export function PlanColorField({
  control,
  isDisabled,
  onEdit,
}: {
  control: Control<PlanDetailsValues>;
  isDisabled: boolean;
  onEdit: () => void;
}) {
  const labelId = useId();
  const errorId = useId();
  return (
    <div className="flex flex-col items-start gap-xs">
      <Label id={labelId} className="text-xs">
        Select a plan color
      </Label>
      <Controller
        name="color"
        control={control}
        render={({ field, fieldState }) => (
          <>
            <ColorPicker
              value={field.value}
              onChange={(value) => {
                // Keep hue/saturation while editing, including for black/white.
                field.onChange(value.toString("hsb"));
                onEdit();
              }}
            >
              <ColorPicker.Trigger
                ref={field.ref}
                onBlur={field.onBlur}
                aria-labelledby={labelId}
                aria-invalid={fieldState.invalid || undefined}
                aria-describedby={fieldState.error ? errorId : undefined}
                isDisabled={isDisabled}
              >
                <ColorSwatch size="lg" />
              </ColorPicker.Trigger>
              <ColorPicker.Popover>
                <ColorArea
                  aria-label="Plan color"
                  colorSpace="hsb"
                  xChannel="saturation"
                  yChannel="brightness"
                >
                  <ColorArea.Thumb />
                </ColorArea>
                <ColorSlider channel="hue" colorSpace="hsb">
                  <Label>Hue</Label>
                  <ColorSlider.Track>
                    <ColorSlider.Thumb />
                  </ColorSlider.Track>
                </ColorSlider>
              </ColorPicker.Popover>
            </ColorPicker>
            {fieldState.error ? (
              <p id={errorId} role="alert" className="text-xs text-danger">
                {fieldState.error.message}
              </p>
            ) : null}
          </>
        )}
      />
    </div>
  );
}
