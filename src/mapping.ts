import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Account, Allowance, Status, Deposit, Withdrawal, Transfer, Approve } from "../generated/schema";
import { Approval as ApprovalEvent, Deposit as DepositEvent, TransferCall, TransferFromCall, Withdrawal as WithdrawalEvent } from "../generated/WETH/WETH";

function ensureAccount(address: Address): Account {
  let account = Account.load(address.toHex())
  if (account === null) {
    account = new Account(address.toHex())
    account.balance = BigInt.fromI32(0)
  }
  return account as Account
}

function ensureAllowance(from: Address, to: Address): Allowance {
  let id = from.toHex() + '-' + to.toHex()
  let allowance = Allowance.load(id)
  if (allowance === null) {
    allowance = new Allowance(id)
    allowance.from = from.toHex()
    allowance.to = to.toHex()
    allowance.value = BigInt.fromI32(0)
  }
  return allowance as Allowance
}

function ensureStatus(): Status {
  let status = Status.load('0')
  if (status === null) {
    status = new Status('0')
    status.totalSupply = BigInt.fromI32(0)
    status.transferVolume = BigInt.fromI32(0)
  }
  return status as Status
}

export function handleApproval(event: ApprovalEvent): void {
  let from = ensureAccount(event.params.src)
  let to = ensureAccount(event.params.guy)
  let allowance = ensureAllowance(event.params.src, event.params.guy)
  let approve = new Approve(event.transaction.hash.toHex() + '-' + event.logIndex.toHex())

  approve.value = event.params.wad
  approve.from = event.params.src.toHex()
  approve.to = event.params.guy.toHex()

  allowance.value = event.params.wad

  from.save()
  to.save()
  allowance.save()
  approve.save()
}
export function handleDeposit(event: DepositEvent): void {
  let dst = ensureAccount(event.params.dst)
  let status = ensureStatus()
  let deposit = new Deposit(event.transaction.hash.toHex() + "-" + event.logIndex.toHex())

  dst.balance = dst.balance.plus(event.params.wad)
  status.totalSupply = status.totalSupply.plus(event.params.wad)

  deposit.account = event.params.dst.toHex()
  deposit.value = event.params.wad

  deposit.save()
  dst.save()
  status.save()
}
export function handleWithdrawal(event: WithdrawalEvent): void {
  let src = ensureAccount(event.params.src)
  let status = ensureStatus()
  let withdrawal = new Withdrawal(event.transaction.hash.toHex() + "-" + event.logIndex.toHex())

  src.balance = src.balance.minus(event.params.wad)
  status.totalSupply = status.totalSupply.minus(event.params.wad)

  withdrawal.account = event.params.src.toHex()
  withdrawal.value = event.params.wad

  withdrawal.save()
  src.save()
  status.save()
}
export function handleTransfer(event: TransferCall): void {
  let status = ensureStatus()
  let from = ensureAccount(event.from)
  let to = ensureAccount(event.inputs.dst)
  let transfer = new Transfer(event.transaction.hash.toHex() + '-' + event.transaction.index.toHex())

  status.transferVolume = status.transferVolume.plus(event.inputs.wad)
  transfer.from = event.from.toHex()
  transfer.to = event.inputs.dst.toHex()

  from.balance = from.balance.minus(event.inputs.wad)
  to.balance = to.balance.plus(event.inputs.wad)

  transfer.save()
  to.save()
  from.save()
  status.save()
}
export function handleTransferFrom(event: TransferFromCall): void {
  let status = ensureStatus()
  let caller = ensureAccount(event.from)
  let from = ensureAccount(event.inputs.src)
  let to = ensureAccount(event.inputs.dst)
  let transfer = new Transfer(event.transaction.hash.toHex() + '-' + event.transaction.index.toHex())
  let allowance = ensureAllowance(event.inputs.src, event.from)

  status.transferVolume = status.transferVolume.plus(event.inputs.wad)
  allowance.value = allowance.value.minus(event.inputs.wad)
  transfer.caller = event.from.toHex()
  transfer.from = event.inputs.src.toHex()
  transfer.to = event.inputs.dst.toHex()

  from.balance = from.balance.minus(event.inputs.wad)
  to.balance = to.balance.plus(event.inputs.wad)

  allowance.save()
  transfer.save()
  to.save()
  from.save()
  caller.save()
  status.save()
}