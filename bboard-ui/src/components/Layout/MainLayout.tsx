// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { Box } from '@mui/material';
import { Header } from './Header';
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Provides layout for the bulletin board application.
 */
export const MainLayout: React.FC<React.PropsWithChildren> = ({ children }) => {


  const { scrollY } = useScroll();

  // Ajustá los valores según el efecto que quieras
  const y = useTransform(scrollY, [0, 500], [0, 100]);


  return (
    <Box sx={{ minHeight: '100vh', overflow: 'hidden' }}>
      <Header />
      <Box sx={{ px: 10, position: 'relative', height: '100%' }}>
      
        <Box
          sx={{
            zIndex: 999,
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            gap: '5px',
            rowGap: '5px',
            alignItems: 'center',
            height: '100%',
            py: '10vh',
            px: '15vw',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};
