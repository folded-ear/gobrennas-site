import {
  CardBody,
  CardHeader,
  Card as HeroCard,
  CardProps as HeroCardProps,
} from "@heroui/react";
import * as React from "react";

import { CardStyles } from "@/components/ui/card/styles";
import { VariantProps } from "class-variance-authority";

const { card, content, description, footer, header, title } = CardStyles();

export type CardProps = HeroCardProps & VariantProps<typeof CardStyles>;

export function Card({ className, ...props }: CardProps) {
  return <HeroCard className={card({ className })} {...props} />;
}

function Header({ className, ...props }: React.ComponentProps<"div">) {
  return <CardHeader className={header({ className })} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="title" className={title({ className })} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="description"
      className={description({ className })}
      {...props}
    />
  );
}

function Content({ className, ...props }: React.ComponentProps<"div">) {
  return <CardBody className={content({ className })} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="footer" className={footer({ className })} {...props} />
  );
}

Card.Content = Content;
Card.Description = CardDescription;
Card.Footer = CardFooter;
Card.Header = Header;
Card.Title = CardTitle;
