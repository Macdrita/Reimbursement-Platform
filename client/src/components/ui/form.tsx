import * as React from "react";
import { cn } from "cn";

function Form({
  className,
  ...props
}: React.ComponentProps<"form">) {
  return <form className={cn("space-y-5", className)} {...props} />;
}

export { Form };
