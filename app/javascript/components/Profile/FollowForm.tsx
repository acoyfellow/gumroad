import { useForm } from "@inertiajs/react";
import cx from "classnames";
import * as React from "react";

import { CreatorProfile } from "$app/parsers/profile";
import { classNames } from "$app/utils/classNames";
import { isValidEmail } from "$app/utils/email";

import { Button } from "$app/components/Button";
import { ButtonColor } from "$app/components/design";
import Errors from "$app/components/Form/Errors";
import { useLoggedInUser } from "$app/components/LoggedInUser";

type FormData = {
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
  const form = useForm<FormData>({
    email: isOwnProfile ? "" : (loggedInUser?.email ?? ""),
    seller_id: creatorProfile.external_id,
  });
  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const isSubmittedSuccessfully = form.wasSuccessful && !form.isDirty;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    form.clearErrors("email");

    if (!isValidEmail(form.data.email)) {
      emailInputRef.current?.focus();
      form.setError(
        "email",
        form.data.email.trim() === "" ? "Please enter your email address." : "Please enter a valid email address.",
      );
      return;
    }

    if (isOwnProfile) {
      form.setError("email", "As the creator of this profile, you can't follow yourself!");
      return;
    }

    form.post(Routes.follow_path(), { preserveScroll: true });
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
            onChange={(event) => {
              form.setData("email", event.target.value);
              form.clearErrors("email");
            }}
            placeholder="Your email address"
          />
              <Button color={buttonColor} disabled={form.processing || isSubmittedSuccessfully} type="submit">
            {buttonLabel && buttonLabel !== "Subscribe"
              ? buttonLabel
              : isSubmittedSuccessfully
                ? "Subscribed"
                : form.processing
                  ? "Subscribing..."
                  : "Subscribe"}
              </Button>
            </div>
            <Errors errors={form.errors.email} label="" />
          </fieldset>
        </form>
      );
};

export const FollowFormBlock = ({
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
