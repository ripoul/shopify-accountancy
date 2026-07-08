import { useState } from 'react'
import { Box, Button, Menu, MenuItem } from '@mui/material'
import { ArrowDropDownRounded } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type LangCode } from '../i18n'
import { useLanguage } from '../i18n/useLanguage'

const LanguageSwitcher = () => {
  const { t } = useTranslation()
  const { language, changeLanguage } = useLanguage()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === language)

  const handleSelect = (code: LangCode) => {
    changeLanguage(code)
    setAnchorEl(null)
  }

  return (
    <>
      <Button
        color="inherit"
        size="small"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={<ArrowDropDownRounded />}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('nav.selectLanguage')}
        sx={{ fontSize: '1.1rem', minWidth: 'auto', px: 1 }}
      >
        {current?.flag}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {SUPPORTED_LANGUAGES.map(({ code, label, flag }) => (
          <MenuItem
            key={code}
            selected={code === language}
            onClick={() => handleSelect(code)}
            sx={{
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 700,
                '&:hover': { bgcolor: 'primary.dark' },
              },
            }}
          >
            <Box component="span" sx={{ mr: 1.5, fontSize: '1.1rem' }}>
              {flag}
            </Box>
            {label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

export default LanguageSwitcher
