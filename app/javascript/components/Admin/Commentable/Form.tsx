import * as React from "react";
import { useForm } from "@inertiajs/react";
import { request } from "$app/utils/request";
import { showAlert } from "$app/components/server-components/Alert";
import { cast } from "ts-safe-cast";
import type { CommentProps } from "$app/components/Admin/Commentable/Comment";

type AdminCommentableFormProps = {
  endpoint: string;
  onCommentAdded: (comment: CommentProps) => void;
  commentableType: string;
};

const AdminCommentableForm = ({
  endpoint,
  onCommentAdded,
  commentableType,
}: AdminCommentableFormProps) => {

  const {
    data: { comment: { content } },
    setData,
    processing,
    reset,
  } = useForm("AdminAddComment", { comment: { content: "" } });

  const onContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setData("comment.content", event.target.value);
  };

  const onSubmit = async(event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (confirm("Are you sure you want to post this comment?")) {
      const formData = new FormData();
      formData.append("comment[content]", content);
      const response = await request({
        method: "POST",
        url: endpoint,
        data: formData,
        accept: "json",
      })
      if (response.ok) {
        const { comment} = cast<{ comment: CommentProps }>(await response.json());
        showAlert("Successfully added comment.", "success");
        reset();
        onCommentAdded(comment);
      } else {
        showAlert("Failed to add comment.", "error");
      }
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <fieldset>
        <div className="input-with-button">
          <textarea name="comment[content]" rows={1} placeholder={`Comment on this ${commentableType}`} required value={content} onChange={onContentChange} />
          <button type="submit" className="button" disabled={processing}>
            {processing ? "Saving..." : "Add comment"}
          </button>
        </div>
      </fieldset>
    </form>
  );
};

export default AdminCommentableForm;
