import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import { Account, Allowance, Status, Deposit, Withdrawal, Transfer, Approve } from "../generated/schema";
import { Approval as ApprovalEvent, Deposit as DepositEvent, Withdrawal as WithdrawalEvent, Transfer as TransferEvent, WETH } from "../generated/WETH/WETH";

function ensureAccount(address: Address): Account {
  let account = Account.load(address.toHexString())
  if (account === null) {
    account = new Account(address.toHexString())
    account.balance = BigInt.fromI32(0)
    account.allowancesFromList = []
  }
  return account as Account
}

function ensureAllowance(from: Account, to: Account): Allowance {
  let id = from.id + '-' + to.id
  let allowance = Allowance.load(id)
  if (allowance === null) {
    allowance = new Allowance(id)
    allowance.from = from.id
    allowance.to = to.id
    allowance.value = BigInt.fromI32(0)
    let newAllowenceFromList = from.allowancesFromList
    newAllowenceFromList.push(Bytes.fromHexString(to.id) as Bytes)
    from.allowancesFromList = newAllowenceFromList
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
  let allowance = ensureAllowance(from, to)
  let approve = new Approve(event.transaction.hash.toHexString() + '-' + event.logIndex.toHexString())

  approve.value = event.params.wad
  approve.from = event.params.src.toHexString()
  approve.to = event.params.guy.toHexString()

  allowance.value = event.params.wad

  from.save()
  to.save()
  allowance.save()
  approve.save()
}
export function handleDeposit(event: DepositEvent): void {
  let dst = ensureAccount(event.params.dst)
  let status = ensureStatus()
  let deposit = new Deposit(event.transaction.hash.toHexString() + "-" + event.logIndex.toHexString())

  dst.balance = dst.balance.plus(event.params.wad)
  status.totalSupply = status.totalSupply.plus(event.params.wad)

  deposit.account = event.params.dst.toHexString()
  deposit.value = event.params.wad

  deposit.save()
  dst.save()
  status.save()
}
export function handleWithdrawal(event: WithdrawalEvent): void {
  let src = ensureAccount(event.params.src)
  let status = ensureStatus()
  let withdrawal = new Withdrawal(event.transaction.hash.toHexString() + "-" + event.logIndex.toHexString())

  src.balance = src.balance.minus(event.params.wad)
  status.totalSupply = status.totalSupply.minus(event.params.wad)

  withdrawal.account = event.params.src.toHexString()
  withdrawal.value = event.params.wad

  withdrawal.save()
  src.save()
  status.save()
}
export function handleTransfer(event: TransferEvent): void {
  let contract = WETH.bind(event.address)
  let status = ensureStatus()
  let from = ensureAccount(event.params.src)
  let to = ensureAccount(event.params.dst)
  let transfer = new Transfer(event.transaction.hash.toHexString() + "-" + event.logIndex.toHexString())

  status.transferVolume = status.transferVolume.plus(event.params.wad)
  transfer.from = event.params.src.toHexString()
  transfer.to = event.params.dst.toHexString()
  transfer.value = event.params.wad
  to.balance = to.balance.plus(event.params.wad)
  from.balance = from.balance.minus(event.params.wad)
  let allowancesFromListStrings = from.get("allowancesFromList").toBytesArray() as Address[]
  for (let i = 0; i < allowancesFromListStrings.length; i++) {
    let allowanceTo = ensureAccount(allowancesFromListStrings[i])
    let newAllowanceValue = contract.allowance(event.params.src, allowancesFromListStrings[i])
    let allowance = ensureAllowance(from, allowanceTo)
    if (!newAllowanceValue.equals(allowance.value)) {
      allowance.value = newAllowanceValue
      transfer.caller = allowance.to
      allowance.save()
      break
    }
  }
  transfer.save()
  to.save()
  from.save()
  status.save()
}
