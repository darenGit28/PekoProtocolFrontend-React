import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useContractWrite, usePrepareContractWrite, useWaitForTransaction } from "wagmi";
import { formatEther, formatUnits, parseEther, parseUnits } from "viem";
import Tr from "../../../../components/tableComponents/Tr";
import { ILiquidation } from "../../../../utils/interfaces";
import { IN_PROGRESS, POOL_CONTRACT_ABI, POOL_CONTRACT_ADDRESS, USDC_CONTRACT_ABI, USDC_CONTRACT_ADDRESS, USDC_DECIMAL } from "../../../../utils/constants";
import Td from "../../../../components/tableComponents/Td";
import FilledButton from "../../../../components/buttons/FilledButton";

//  -----------------------------------------------------------------------------------------

interface IProps {
  liquidation: ILiquidation;
  ethPriceInUsd: number;
  usdcPriceInUsd: number;
}

//  -----------------------------------------------------------------------------------------

export default function Row({ liquidation, ethPriceInUsd, usdcPriceInUsd }: IProps) {
  const [liquidateEthValue, setLiquidateEthValue] = useState<number>(0)
  const [liquidateUsdcValue, setLiquidateUsdcValue] = useState<number>(0)

  //  ----------------------------------------------------------------------------------------

  //  Liquidate
  const { config: liquidateConfig } = usePrepareContractWrite({
    address: POOL_CONTRACT_ADDRESS,
    abi: POOL_CONTRACT_ABI,
    functionName: 'liquidate',
    args: [liquidation.accountAddress],
    value: parseEther(`${liquidateEthValue}`)
  })

  const { write: liquidate, data: liquidateData } = useContractWrite(liquidateConfig);

  const { isLoading: liquidateIsLoading, isSuccess: liqudateIsSuccess, isError: liquidateIsError } = useWaitForTransaction({
    hash: liquidateData?.hash
  })

  //  Approve USDC
  const { config: approveConfig } = usePrepareContractWrite({
    address: USDC_CONTRACT_ADDRESS,
    abi: USDC_CONTRACT_ABI,
    functionName: 'approve',
    args: [POOL_CONTRACT_ADDRESS, parseUnits(`${liquidateUsdcValue}`, USDC_DECIMAL)],
  })

  const { write: approve, data: approveData } = useContractWrite(approveConfig);

  const { isLoading: approveIsLoading, isError: approveIsError } = useWaitForTransaction({
    hash: approveData?.hash,
    onSuccess: () => {
      liquidate?.()
    }
  })

  //  ----------------------------------------------------------------------------------------

  const handleLiquidate = async () => {
    if (liquidateUsdcValue > 0) {
      approve?.()
    } else {
      liquidate?.()
    }
  }

  //  ----------------------------------------------------------------------------------------

  useEffect(() => {
    if (liqudateIsSuccess) {
      toast.success('Liquidated.')
    }
  }, [liqudateIsSuccess])

  useEffect(() => {
    if (liquidateIsError) {
      toast.error('Error.')
    }
  }, [liquidateIsError])

  useEffect(() => {
    if (approveIsError) {
      toast.error('Approve Error.')
    }
  }, [approveIsError])

  useEffect(() => {
    setLiquidateEthValue(Number(formatEther(liquidation.ethBorrowAmount + liquidation.ethInterestAmount)))
    setLiquidateUsdcValue(Number(formatUnits(liquidation.usdtBorrowAmount + liquidation.usdtInterestAmount, USDC_DECIMAL)))
  }, [liquidation])

  //  ----------------------------------------------------------------------------------------
  return (
    <Tr>
      {/* Borrowed Value */}
      <Td>
        {liquidation.ethBorrowAmount && liquidation.usdtBorrowAmount ? (
          <div className="flex flex-col gap-1">
            <span className="uppercase">{Number(formatEther(liquidation.ethBorrowAmount + liquidation.ethInterestAmount)).toFixed(4)} ETH</span>
            <span className="uppercase">
              {Number(formatUnits(liquidation.usdtBorrowAmount + liquidation.usdtInterestAmount, USDC_DECIMAL)).toFixed(4)} USDC
            </span>
          </div>
        ) : !liquidation.ethBorrowAmount && liquidation.usdtBorrowAmount ? (
          <span className="uppercase">
            {Number(formatUnits(liquidation.usdtBorrowAmount + liquidation.usdtInterestAmount, USDC_DECIMAL)).toFixed(4)} USDC
          </span>
        ) : (
          <span className="uppercase">{Number(formatEther(liquidation.ethBorrowAmount + liquidation.ethInterestAmount)).toFixed(4)} ETH</span>
        )}
      </Td>

      {/* Deposited Value */}
      <Td>
        {liquidation.ethDepositAmount && liquidation.usdtDepositAmount ? (
          <div className="flex flex-col gap-1">
            <span className="uppercase">{Number(formatEther(liquidation.ethDepositAmount + liquidation.ethRewardAmount)).toFixed(4)} ETH</span>
            <span className="uppercase">{Number(formatUnits(liquidation.usdtDepositAmount + liquidation.usdtRewardAmount, USDC_DECIMAL)).toFixed(4)} USDC</span>
          </div>
        ) : !liquidation.ethDepositAmount && liquidation.usdtDepositAmount ? (
          <span className="uppercase">{Number(formatUnits(liquidation.usdtDepositAmount + liquidation.usdtRewardAmount, USDC_DECIMAL)).toFixed(4)} USDC</span>
        ) : (
          <span className="uppercase">{Number(formatEther(liquidation.ethDepositAmount + liquidation.ethRewardAmount)).toFixed(4)} ETH</span>
        )}
      </Td>

      {/* Risk Factor */}
      <Td className="text-red-500">
        {liquidation.riskFactor.toFixed(4)} %
      </Td>

      <Td>
        <FilledButton
          disabled={!approve || approveIsLoading || liquidateIsLoading}
          onClick={() => handleLiquidate()}
        >
          {approveIsLoading || liquidateIsLoading ? IN_PROGRESS : 'Liquidate'}
        </FilledButton>
      </Td>
    </Tr>
  )
}