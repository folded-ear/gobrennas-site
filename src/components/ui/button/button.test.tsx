import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders with default variant and size", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("ds-bg-primary");
    expect(button).toHaveClass("ds-h-10");
  });

  it("renders with different variants", () => {
    const variants = [
      "default",
      "destructive",
      "outline",
      "secondary",
      "ghost",
      "link",
    ] as const;

    variants.forEach((variant) => {
      const { unmount } = render(
        <Button variant={variant}>Variant {variant}</Button>,
      );
      const button = screen.getByRole("button", { name: `Variant ${variant}` });
      expect(button).toBeInTheDocument();
      unmount();
    });
  });

  it("renders with different sizes", () => {
    const sizes = ["default", "sm", "lg", "icon"] as const;

    sizes.forEach((size) => {
      const { unmount } = render(<Button size={size}>Size {size}</Button>);
      const button = screen.getByRole("button", { name: `Size ${size}` });
      expect(button).toBeInTheDocument();
      unmount();
    });
  });

  it("applies custom className", () => {
    render(<Button className="custom-class">Custom Class</Button>);
    const button = screen.getByRole("button", { name: "Custom Class" });
    expect(button).toHaveClass("custom-class");
  });

  it("handles disabled state", () => {
    render(<Button isDisabled>Disabled Button</Button>);
    const button = screen.getByRole("button", { name: "Disabled Button" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-disabled");
  });

  it("forwards additional props", () => {
    render(
      <Button data-testid="test-button" aria-label="Test Button">
        Test
      </Button>,
    );
    const button = screen.getByTestId("test-button");
    expect(button).toHaveAttribute("aria-label", "Test Button");
  });
});
