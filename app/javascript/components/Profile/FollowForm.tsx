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

export const FollowForm = ({
  creatorProfile,
  buttonColor,
  buttonLabel,
  onSuccess,
}: {
  creatorProfile: CreatorProfile;
  buttonColor?: ButtonColor;
  buttonLabel?: string;
  onSuccess?: (redirectUrl?: string) => void;
}) => {
  const loggedInUser = useLoggedInUser();
  const isOwnProfile = loggedInUser?.id === creatorProfile.external_id;
  const emailInputRef = React.useRef<HTMLInputElement>(null);

  const { data, setData, post, processing, errors, reset } = useForm({
    email: isOwnProfile ? "" : (loggedInUser?.email ?? ""),
    seller_id: creatorProfile.external_id,
    redirect_back: "user_page", // Default to user_page, can be set to 'subscribe'
  });

  const formStatus = processing ? "submitting" : errors.email ? "invalid" : "initial";

  React.useEffect(() => {
    if (errors.email) {
      emailInputRef.current?.focus();
    }
  }, [errors.email]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(data.email)) {
      showAlert(
        data.email.trim() === "" ? "Please enter your email address." : "Please enter a valid email address.",
        "error",
      );
      return;
    }

    if (isOwnProfile) {
      showAlert("As the creator of this profile, you can't follow yourself!", "warning");
      return;
    }

    post(Routes.follow_user_path(), {
      onSuccess: (page: any) => {
        const redirectUrl = page.props.redirect_url;
        showAlert("Successfully followed!", "success");
        if (onSuccess) {
          onSuccess(redirectUrl);
        }
        // Optionally reset form
        reset();
      },
      onError: (error: any) => {
        const message = error.message || "Sorry, something went wrong. Please try again.";
        showAlert(message, "error");
      },
    });
  };

  return (
    <form onSubmit={submit} style={{ flexGrow: 1 }} noValidate>
      <fieldset className={cx({ danger: formStatus === "invalid" })}>
        <div className="flex gap-2">
          <input
            ref={emailInputRef}
            type="email"
            value={data.email}
            className="flex-1"
            onChange={(event) => setData("email", event.target.value)}
            placeholder="Your email address"
          />
          <Button color={buttonColor} disabled={processing} type="submit">
            {buttonLabel && buttonLabel !== "Subscribe" ? buttonLabel : processing ? "Subscribing..." : "Subscribe"}
          </Button>
        </div>
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
}) => {
  const handleSuccess = (redirectUrl?: string) => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  return (
    <div className={classNames("flex grow flex-col justify-center", className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16">
        <h1>Subscribe to receive email updates from {creatorProfile.name}.</h1>
        <div className="max-w-lg">
          <FollowForm creatorProfile={creatorProfile} buttonColor="primary" onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
};
