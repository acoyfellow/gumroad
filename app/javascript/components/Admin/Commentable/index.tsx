import React from "react";
import { cast } from "ts-safe-cast";

import { useLazyPaginatedFetch } from "$app/hooks/useLazyFetch";

import AdminCommentableContent from "$app/components/Admin/Commentable/Content";
import AdminCommentableForm from "$app/components/Admin/Commentable/Form";
import type { CommentProps } from "$app/components/Admin/Commentable/Comment";

type AdminCommentableProps = {
  endpoint: string;
  commentableType: string;
};

const AdminCommentableComments = ({
  endpoint,
  commentableType,
}: AdminCommentableProps) => {
  const [open, setOpen] = React.useState(false);

  const {
    data: comments,
    isLoading,
    setData: setComments,
    fetchData: fetchComments,
    hasMore,
    pagination,
    setHasMore,
    setHasLoaded,
  } = useLazyPaginatedFetch<CommentProps[]>(
    [] as CommentProps[],
    {
      url: endpoint,
      responseParser: (data) => cast<CommentProps[]>(data.comments),
      mode: "append",
    }
  );

  const [count, setCount] = React.useState(pagination.count);

  React.useEffect(() => {
    setCount(pagination.count);
  }, [pagination.count]);

  const resetComments = () => {
    setComments([]);
    setCount(pagination.count);
    setHasLoaded(false);
    setHasMore(true);
  }

  const onToggle = (e: React.MouseEvent<HTMLDetailsElement>) => {
    setOpen(e.currentTarget.open);
    if (e.currentTarget.open) {
      fetchComments();
    } else {
      resetComments();
    }
  }

  const appendComment = (comment: CommentProps) => {
    setComments([comment, ...comments]);
    setCount(count + 1);
  }

  const fetchNextPage = () => {
    if (pagination?.next) {
      fetchComments({ page: pagination.next });
    }
  }

  return (
    <>
      <hr />
      <details open={open} onToggle={onToggle} className="space-y-2">
        <summary>
          <h3>Comments</h3>
        </summary>
        <AdminCommentableForm
          endpoint={endpoint}
          onCommentAdded={appendComment}
          commentableType={commentableType}
        />
        <AdminCommentableContent
          count={count}
          comments={comments}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={fetchNextPage}
        />
      </details>
    </>
  )
};

export default AdminCommentableComments;
