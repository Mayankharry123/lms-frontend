import Swal from 'sweetalert2'
import type { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2'

type AlertOverride = Partial<{
  title: string
  text: string
  icon: SweetAlertIcon
  timer: number | null
}>;

const DEFAULT_TIMER = 1500
const CONFIRM_COLOR = '#2563EB' // primary (blue-600)
const CANCEL_COLOR = '#6B7280' // gray-500
const SUCCESS_COLOR = '#10B981' // green-500
const DELETE_COLOR = '#EF4444' // red-500
const WARNING_COLOR = '#F59E0B' // amber-500
const INFO_COLOR = '#3B82F6' // blue-500

function baseAlert(opts: SweetAlertOptions) {
  return Swal.fire({
    position: 'center',
    showClass: { popup: 'swal2-show' },
    hideClass: { popup: 'swal2-hide' },
    backdrop: true,
    allowOutsideClick: false,
    allowEscapeKey: true,
    ...opts,
  })
}

const SweetAlert = {
  // ============= Basic Alerts =============
  showToast(override?: AlertOverride & { position?: SweetAlertOptions['position'] }) {
    const opts: SweetAlertOptions = {
      toast: true,
      position: override?.position ?? 'top-end',
      showConfirmButton: false,
      timer: typeof override?.timer === 'number' ? override!.timer : DEFAULT_TIMER,
      timerProgressBar: true,
      icon: override?.icon ?? 'success',
      title: override?.title ?? 'Success',
      text: override?.text ?? undefined,
    }
    return Swal.fire(opts)
  },

  showSuccess(override?: AlertOverride) {
    const opts: SweetAlertOptions = {
      icon: override?.icon ?? 'success',
      title: override?.title ?? 'Success',
      text: override?.text ?? undefined,
      timer: typeof override?.timer === 'number' ? override!.timer : DEFAULT_TIMER,
      showConfirmButton: false,
      customClass: { popup: 'swal2-popup' },
    }
    return baseAlert(opts)
  },

  showError(message?: string, override?: AlertOverride) {
    const opts: SweetAlertOptions = {
      icon: override?.icon ?? 'error',
      title: override?.title ?? 'Error',
      text: message ?? override?.text ?? undefined,
      confirmButtonColor: CONFIRM_COLOR,
      iconColor: DELETE_COLOR,
    }
    return baseAlert(opts)
  },

  showWarning(message?: string, override?: AlertOverride) {
    const opts: SweetAlertOptions = {
      icon: override?.icon ?? 'warning',
      title: override?.title ?? 'Warning',
      text: message ?? override?.text ?? undefined,
      confirmButtonColor: CONFIRM_COLOR,
      iconColor: WARNING_COLOR,
    }
    return baseAlert(opts)
  },

  showInfo(message?: string, override?: AlertOverride) {
    const opts: SweetAlertOptions = {
      icon: override?.icon ?? 'info',
      title: override?.title ?? 'Info',
      text: message ?? override?.text ?? undefined,
      confirmButtonColor: CONFIRM_COLOR,
      iconColor: INFO_COLOR,
    }
    return baseAlert(opts)
  },

  // ============= CREATE Action =============
  showCreateSuccess(override?: AlertOverride) {
    return baseAlert({
      icon: 'success',
      title: override?.title ?? 'Created Successfully!',
      text: override?.text ?? 'Your new record has been created',
      timer: typeof override?.timer === 'number' ? override!.timer : DEFAULT_TIMER,
      showConfirmButton: false,
      didOpen: (modal) => {
        modal.classList.add('swal2-success-animation')
      },
      customClass: { popup: 'swal2-popup-success' },
      iconColor: SUCCESS_COLOR,
    })
  },

  async showConfirmCreate(override?: AlertOverride) {
    const result = await baseAlert({
      title: override?.title ?? 'Create New Record?',
      text: override?.text ?? 'Please confirm to create this new record',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, create it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: SUCCESS_COLOR,
      cancelButtonColor: CANCEL_COLOR,
      iconColor: INFO_COLOR,
    })
    return !!result.isConfirmed
  },

  // ============= UPDATE Action =============
  showUpdateSuccess(override?: AlertOverride) {
    return baseAlert({
      icon: 'success',
      title: override?.title ?? 'Updated Successfully!',
      text: override?.text ?? 'Your changes have been saved',
      timer: typeof override?.timer === 'number' ? override!.timer : DEFAULT_TIMER,
      showConfirmButton: false,
      customClass: { popup: 'swal2-popup-update' },
      iconColor: CONFIRM_COLOR,
    })
  },

  async showConfirmUpdate(override?: AlertOverride) {
    const result = await baseAlert({
      title: override?.title ?? 'Update Record?',
      text: override?.text ?? 'Are you sure you want to update this record?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, update it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: CONFIRM_COLOR,
      cancelButtonColor: CANCEL_COLOR,
      iconColor: INFO_COLOR,
    })
    return !!result.isConfirmed
  },

  // ============= DELETE Action =============
  showDeleteSuccess(override?: AlertOverride) {
    return baseAlert({
      icon: 'success',
      title: override?.title ?? 'Deleted Successfully!',
      text: override?.text ?? 'The record has been permanently deleted',
      timer: typeof override?.timer === 'number' ? override!.timer : DEFAULT_TIMER,
      showConfirmButton: false,
      customClass: { popup: 'swal2-popup-delete' },
      iconColor: SUCCESS_COLOR,
    })
  },

  async showConfirmDelete(override?: AlertOverride) {
    const result = await baseAlert({
      title: override?.title ?? 'Delete Permanently?',
      text: override?.text ?? 'This action cannot be undone. All associated data will be deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: DELETE_COLOR,
      cancelButtonColor: CANCEL_COLOR,
      iconColor: DELETE_COLOR,
      didOpen: (modal) => {
        const confirmBtn = modal.querySelector('.swal2-confirm') as HTMLElement
        confirmBtn?.classList.add('swal2-delete-btn')
      },
    })
    return !!result.isConfirmed
  },

  // ============= SAVE Action =============
  showSaveSuccess(override?: AlertOverride) {
    return baseAlert({
      icon: 'success',
      title: override?.title ?? 'Saved Successfully!',
      text: override?.text ?? 'Your data has been saved',
      timer: typeof override?.timer === 'number' ? override!.timer : DEFAULT_TIMER,
      showConfirmButton: false,
      customClass: { popup: 'swal2-popup-save' },
      iconColor: SUCCESS_COLOR,
    })
  },

  async showConfirmSave(override?: AlertOverride) {
    const result = await baseAlert({
      title: override?.title ?? 'Save Changes?',
      text: override?.text ?? 'Do you want to save your changes?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, save',
      cancelButtonText: 'Cancel',
      confirmButtonColor: SUCCESS_COLOR,
      cancelButtonColor: CANCEL_COLOR,
      iconColor: INFO_COLOR,
    })
    return !!result.isConfirmed
  },

  // ============= SUBMIT Action =============
  showSubmitSuccess(override?: AlertOverride) {
    return baseAlert({
      icon: 'success',
      title: override?.title ?? 'Submitted Successfully!',
      text: override?.text ?? 'Your submission has been received',
      timer: typeof override?.timer === 'number' ? override!.timer : DEFAULT_TIMER,
      showConfirmButton: false,
      customClass: { popup: 'swal2-popup-submit' },
      iconColor: SUCCESS_COLOR,
    })
  },

  async showConfirmSubmit(override?: AlertOverride) {
    const result = await baseAlert({
      title: override?.title ?? 'Submit?',
      text: override?.text ?? 'Please confirm to submit this form',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, submit',
      cancelButtonText: 'Cancel',
      confirmButtonColor: SUCCESS_COLOR,
      cancelButtonColor: CANCEL_COLOR,
      iconColor: INFO_COLOR,
    })
    return !!result.isConfirmed
  },

  // ============= ASSIGN Action =============
  showAssignSuccess(override?: AlertOverride) {
    return baseAlert({
      icon: 'success',
      title: override?.title ?? 'Assigned Successfully! 👤',
      text: override?.text ?? 'The item has been assigned',
      timer: typeof override?.timer === 'number' ? override!.timer : DEFAULT_TIMER,
      showConfirmButton: false,
      customClass: { popup: 'swal2-popup-assign' },
      iconColor: CONFIRM_COLOR,
    })
  },

  async showConfirmAssign(override?: AlertOverride) {
    const result = await baseAlert({
      title: override?.title ?? 'Assign Item?',
      text: override?.text ?? 'Are you sure you want to assign this item?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, assign',
      cancelButtonText: 'Cancel',
      confirmButtonColor: CONFIRM_COLOR,
      cancelButtonColor: CANCEL_COLOR,
      iconColor: INFO_COLOR,
    })
    return !!result.isConfirmed
  },

  // ============= APPROVE/REJECT Action =============
  showApproveSuccess(override?: AlertOverride) {
    return baseAlert({
      icon: 'success',
      title: override?.title ?? 'Approved Successfully! ✔️',
      text: override?.text ?? 'The request has been approved',
      timer: typeof override?.timer === 'number' ? override!.timer : DEFAULT_TIMER,
      showConfirmButton: false,
      customClass: { popup: 'swal2-popup-approve' },
      iconColor: SUCCESS_COLOR,
    })
  },

  async showConfirmApprove(override?: AlertOverride) {
    const result = await baseAlert({
      title: override?.title ?? 'Approve?',
      text: override?.text ?? 'Are you sure you want to approve this request?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, approve',
      cancelButtonText: 'Cancel',
      confirmButtonColor: SUCCESS_COLOR,
      cancelButtonColor: CANCEL_COLOR,
      iconColor: INFO_COLOR,
    })
    return !!result.isConfirmed
  },

  showRejectSuccess(override?: AlertOverride) {
    return baseAlert({
      icon: 'success',
      title: override?.title ?? 'Rejected Successfully!',
      text: override?.text ?? 'The request has been rejected',
      timer: typeof override?.timer === 'number' ? override!.timer : DEFAULT_TIMER,
      showConfirmButton: false,
      customClass: { popup: 'swal2-popup-reject' },
      iconColor: DELETE_COLOR,
    })
  },

  async showConfirmReject(override?: AlertOverride) {
    const result = await baseAlert({
      title: override?.title ?? 'Reject?',
      text: override?.text ?? 'Are you sure you want to reject this request?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reject',
      cancelButtonText: 'Cancel',
      confirmButtonColor: DELETE_COLOR,
      cancelButtonColor: CANCEL_COLOR,
      iconColor: WARNING_COLOR,
    })
    return !!result.isConfirmed
  },

  // ============= EXPORT/DOWNLOAD Action =============
  showExportSuccess(override?: AlertOverride) {
    return baseAlert({
      icon: 'success',
      title: override?.title ?? 'Exported Successfully!',
      text: override?.text ?? 'Your file is ready to download',
      timer: typeof override?.timer === 'number' ? override!.timer : DEFAULT_TIMER,
      showConfirmButton: false,
      customClass: { popup: 'swal2-popup-export' },
      iconColor: INFO_COLOR,
    })
  },

  // ============= LOADING/PROCESSING Action =============
  showLoading(override?: AlertOverride) {
    return baseAlert({
      title: override?.title ?? 'Processing...',
      text: override?.text ?? 'Please wait',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading()
      },
      customClass: { popup: 'swal2-popup-loading' },
    })
  },

  hideLoading() {
    Swal.hideLoading()
    Swal.close()
  },

  // ============= CONFIRMATION Dialog =============
  async showConfirm(override?: AlertOverride) {
    const result = await baseAlert({
      title: override?.title ?? 'Are you sure?',
      text: override?.text ?? 'Please confirm this action',
      icon: override?.icon ?? 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
      confirmButtonColor: CONFIRM_COLOR,
      cancelButtonColor: CANCEL_COLOR,
      iconColor: INFO_COLOR,
    })
    return !!result.isConfirmed
  },

  // ============= CLOSE Alert =============
  close() {
    Swal.close()
  },
}

export default SweetAlert
