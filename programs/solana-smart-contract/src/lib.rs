use anchor_lang::prelude::*;

declare_id!("3sybqPuS4jNM9txKMe15F72UR6gys4eoJoHHHrigTJ8Q");

#[program]
pub mod solana_smart_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}


