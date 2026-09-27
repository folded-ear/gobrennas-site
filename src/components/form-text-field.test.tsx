import { render, screen, userEvent, waitFor } from "@/test";
import { Form } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { FormTextField } from "./form-text-field";

const schema = z.object({
  name: z.string().min(3, "Enter at least three characters."),
  notes: z.string(),
});

function ExampleForm({
  onSubmit,
}: {
  onSubmit: (values: z.infer<typeof schema>) => void;
}) {
  const { control, handleSubmit } = useForm({
    defaultValues: { name: "", notes: "Chill overnight." },
    resolver: zodResolver(schema),
  });
  return (
    <Form onSubmit={handleSubmit(onSubmit)} validationBehavior="aria">
      <FormTextField
        control={control}
        name="name"
        label="Name"
        description="Choose a name."
        isRequired
      />
      <FormTextField
        control={control}
        name="notes"
        label="Notes"
        multiline
        rows={4}
      />
      <button type="submit">Save</button>
    </Form>
  );
}

describe("FormTextField", () => {
  it("renders labeled fields, descriptions, and initial multiline text", () => {
    render(<ExampleForm onSubmit={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: "Name" })).toBeRequired();
    expect(
      screen.getByRole("textbox", { name: "Name" }),
    ).toHaveAccessibleDescription("Choose a name.");
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue(
      "Chill overnight.",
    );
  });

  it("associates errors, focuses an invalid field, and revalidates edits before submitting raw values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ExampleForm onSubmit={onSubmit} />);
    const name = screen.getByRole("textbox", { name: "Name" });
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription(
      "Choose a name. Enter at least three characters.",
    );
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(name, "Pi");
    expect(name).toHaveAttribute("aria-invalid", "true");
    await user.type(name, "e ");
    await waitFor(() =>
      expect(name).not.toHaveAttribute("aria-invalid", "true"),
    );
    expect(name).toHaveAccessibleDescription("Choose a name.");
    await user.type(
      screen.getByRole("textbox", { name: "Notes" }),
      "{Enter}Serve cold.",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: "Pie ",
      notes: "Chill overnight.\nServe cold.",
    });
  });
});
