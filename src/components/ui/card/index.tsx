import {
  Card as HeroCard,
  CardBody as HeroCardBody,
  CardHeader as HeroCardHeader,
  CardProps as HeroCardProps,
} from "@heroui/react";
import * as React from "react";

import { CardStyles } from "@/components/ui/card/styles";
import { VariantProps } from "class-variance-authority";

const { card, content, description, footer, header, title } = CardStyles();

type CardProps = HeroCardProps & VariantProps<typeof CardStyles>;

function Card({ className, ...props }: CardProps) {
  return <HeroCard className={card({ className })} {...props} />;
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <HeroCardHeader className={header({ className })} {...props} />;
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

function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <HeroCardBody className={content({ className })} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="footer" className={footer({ className })} {...props} />
  );
}

export {
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type CardProps,
};
