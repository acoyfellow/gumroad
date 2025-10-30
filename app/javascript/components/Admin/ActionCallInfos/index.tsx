import { router } from "@inertiajs/react";
import React from "react";

import { type Pagination as PaginationType } from "$app/hooks/useLazyFetch";

import AdminActionCallInfosActionCallInfo, {
  type AdminActionCallInfoProps,
} from "$app/components/Admin/ActionCallInfos/ActionCallInfo";
import { Pagination } from "$app/components/Pagination";

type AdminActionCallInfosProps = {
  action_call_infos: AdminActionCallInfoProps[];
  pagination: PaginationType;
};

const AdminActionCallInfos = ({ action_call_infos, pagination }: AdminActionCallInfosProps) => {
  const paginationProps = {
    pages: pagination.count ? Math.ceil(pagination.count / pagination.limit) : 1,
    page: pagination.page,
  };

  const onChangePage = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", page.toString());
    router.visit(Routes.admin_action_call_dashboard_path(), {
      data: Object.fromEntries(params),
      only: ["admin_action_call_infos"],
    });
  };

  return (
    <div className="paragraphs">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Controller</th>
            <th>Action</th>
            <th>Call Count</th>
          </tr>
        </thead>
        <tbody>
          {action_call_infos.map((action_call_info, index) => (
            <AdminActionCallInfosActionCallInfo
              key={index}
              index={index + 1}
              controller_name={action_call_info.controller_name}
              action_name={action_call_info.action_name}
              call_count={action_call_info.call_count}
            />
          ))}
          {action_call_infos.length === 0 && pagination.page === 1 && (
            <tr>
              <td colSpan={4} className="text-center">
                No action call infos found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {paginationProps.pages > 1 && <Pagination pagination={paginationProps} onChangePage={onChangePage} />}
    </div>
  );
};

export default AdminActionCallInfos;
