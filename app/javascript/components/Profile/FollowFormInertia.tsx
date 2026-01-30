import cx from "classnames";
import * as React from "react";
import { useForm } from "@inertiajs/react";

import { CreatorProfile } from "$app/parsers/profile";
import { classNames } from "$app/utils/classNames";
import { isValidEmail } from "$app/utils/email";

import { Button } from "$app/components/Button";
import { ButtonColor } from "$app/components/design";
import { useLoggedInUser } from "$app/components/LoggedInUser";
import { showAlert } from "$app/components/server-components/Alert";

type FollowFormData = {
  email: string;
  seller_id: string;
};

export const FollowForm = ({
  creatorProfile,
  buttonColor,
  buttonLabel,
}: {
  creatorProfile: CreatorProfile;
  buttonColor?: ButtonColor;
  buttonLabel?: string;
}) => {
  const loggedInUser = useLoggedInUser();
  const isOwnProfile = loggedInUser?.id === creatorProfile.external_id;
  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const form = useForm<FollowFormData>({
    email: isOwnProfile ? "" : (loggedInUser?.email ?? ""),
    seller_id: creatorProfile.external_id,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const email = form.data.email;

    if (!isValidEmail(email)) {
      emailInputRef.current?.focus();
      form.setError(
        "email",
        email.trim() === "" ? "Please enter your email address." : "Please enter a valid email address.",
      );
      showAlert(
        email.trim() === "" ? "Please enter your email address." : "Please enter a valid email address.",
        "error",
      );
      return;
    }

    if (isOwnProfile) {
      showAlert("As the creator of this profile, you can't follow yourself!", "warning");
      return;
    }

    form.clearErrors();
    form.post(Routes.follow_user_path(), {
      onSuccess: () => {
        setShowSuccess(true);
      },
    });
  };

  return (
    <form onSubmit={(e) => void submit(e)} style={{ flexGrow: 1 }} noValidate>
      <fieldset className={cx({ danger: form.errors.email })}>
        <div className="flex gap-2">
          <input
            ref={emailInputRef}
            type="email"
            value={form.data.email}
            className="flex-1"
            onChange={(event) => form.setData("email", event.target.value)}
            placeholder="Your email address"
            disabled={form.processing || showSuccess}
          />
          <Button color={buttonColor} disabled={form.processing || showSuccess} type="submit">
            {buttonLabel && buttonLabel !== "Subscribe"
              ? buttonLabel
              : showSuccess
                ? "Subscribed"
                : form.processing
                  ? "Subscribing..."
                  : "Subscribe"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
};

export const FollowFormBlockInertia = ({
  creatorProfile,
  className,
}: {
  creatorProfile: CreatorProfile;
  className?: string;
}) => (
  <div className={classNames("flex grow flex-col justify-center", className)}>
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16">
      <h1>Subscribe to receive email updates from {creatorProfile.name}.</h1>
      <div className="max-w-lg">
        <FollowForm creatorProfile={creatorProfile} buttonColor="primary" />
      </div>
    </div>
  </div>
);
