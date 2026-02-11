import { Link } from "@inertiajs/react";
import * as React from "react";

import { Icon } from "$app/components/Icons";
import { TableCell } from "$app/components/ui/Table";

export const ProductIconCell = ({
  productEditUrl = false,
  href,
  thumbnail,
  placeholder = <Icon name="card-image-fill" />,
}: {
  productEditUrl?: boolean;
  href: string;
  thumbnail: string | null;
  placeholder?: React.ReactNode;
}) => {
  const NavigationComponent = productEditUrl ? Link : "a";

  return (
    <TableCell hideLabel className="relative text-center text-xl lg:w-20 lg:min-w-20 lg:border-r lg:border-border">
      <NavigationComponent href={href}>
        {thumbnail ? (
          <img
            className="max-w-20 lg:absolute lg:inset-0 lg:h-full lg:w-full lg:object-cover"
            role="presentation"
            src={thumbnail}
          />
        ) : (
          placeholder
        )}
      </NavigationComponent>
    </TableCell>
  );
};
